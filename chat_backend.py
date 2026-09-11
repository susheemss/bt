"""
AI Assistant backend: takes a user question plus the browser's already-
parsed store/SKU data (the exact same object driving the charts -- no
second Excel parser here, one source of truth), gives an LLM a small fixed
set of tools that look up real values from that data, and returns the
model's final answer.

Uses OpenRouter (https://openrouter.ai), an OpenAI-compatible API that
proxies many providers/models, several with a free tier. Only Python's
standard library is used -- no pip install needed.

Config (both plain text files next to this one, first line only):
  openrouter_api_key.txt  -- your OpenRouter API key (gitignored)
  openrouter_model.txt    -- which model id to call, e.g.
                             "google/gemini-2.0-flash-exp:free"
"""
import json
import urllib.request
import urllib.error
from pathlib import Path

APP_DIR = Path(__file__).parent
API_KEY_FILE = APP_DIR / 'openrouter_api_key.txt'
MODEL_FILE = APP_DIR / 'openrouter_model.txt'
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
# openrouter/free auto-selects among currently-available free models and
# filters for tool-calling support -- avoids hardcoding a specific free
# model id, since OpenRouter's free catalog rotates (models get delisted
# often; a fixed id here already went stale once during testing).
DEFAULT_MODEL = 'openrouter/free'

SYSTEM_PROMPT = (
    "You are a supply-chain assistant embedded in a demand & replenishment "
    "cockpit. Answer only using the tools provided -- they read real data "
    "the user has loaded from their own Excel files. Never state a number "
    "you did not get from a tool call. If a tool returns no data for what "
    "was asked (a store, SKU or customer that doesn't exist, or a "
    "combination with no rows), say so plainly rather than guessing or "
    "estimating. Keep answers short and concrete -- lead with the number, "
    "then a brief supply-chain-relevant note if useful. Use the terms "
    "on-hand, ROP, net requirement, replenishment quantity, sensed demand "
    "-- not generic words like 'stock' or 'order'."
)


class ChatError(Exception):
    pass


def _read_config(path, label):
    if not path.is_file():
        raise ChatError(f'{label} not found: {path}. Create it with your value on the first line.')
    val = path.read_text(encoding='utf-8').strip()
    if not val:
        raise ChatError(f'{path.name} is empty.')
    return val


def get_model():
    if MODEL_FILE.is_file():
        val = MODEL_FILE.read_text(encoding='utf-8').strip()
        if val:
            return val
    return DEFAULT_MODEL


# ════════════════════════════════════════════════════════════════
# TOOLS -- each one is a pure lookup over the data the browser sent.
# No business logic lives here; it's all already computed client-side
# (same net-requirement/status/join logic used for the charts), these
# just navigate that already-computed structure.
# ════════════════════════════════════════════════════════════════

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "list_stores",
            "description": "List every store name currently loaded.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_skus",
            "description": "List SKU names for a store, optionally only those with real inventory data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "store": {"type": "string", "description": "Store name, e.g. 'Location 817'"},
                    "only_with_inventory": {"type": "boolean", "description": "If true, only list SKUs that have real on-hand/ROP data"},
                },
                "required": ["store"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_customers",
            "description": "List customer names known for a store (from either the demand or inventory file).",
            "parameters": {
                "type": "object",
                "properties": {"store": {"type": "string"}},
                "required": ["store"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sku_snapshot",
            "description": (
                "Get the current on-hand, safety stock, ROP, net requirement, "
                "replenishment quantity and status for one SKU at one store. "
                "This is the real inventory figures, not a forecast."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "store": {"type": "string"},
                    "sku": {"type": "string", "description": "Exact SKU name"},
                },
                "required": ["store", "sku"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_flagged_skus",
            "description": (
                "List SKUs at a store currently flagged with a given status "
                "(replenish, low, ok, hold, or redeploy). Use this for "
                "questions like 'which SKUs need replenishing'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "store": {"type": "string"},
                    "status": {"type": "string", "enum": ["replenish", "low", "ok", "hold", "redeploy"]},
                },
                "required": ["store", "status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_demand_series",
            "description": (
                "Get the baseline demand forecast and AI-sensed demand, "
                "month by month, for a store (optionally one SKU). This is "
                "the Baseline (units) + Promo Units demand-file data behind "
                "the 'Demand forecast' bar chart."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "store": {"type": "string"},
                    "sku": {"type": "string", "description": "Optional; omit for the whole store"},
                },
                "required": ["store"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sensing_series",
            "description": (
                "Get the Total Demand and Sensed Forecast, month by month, "
                "from the separate demand-sensing file -- the data behind "
                "the 'Demand sensing vs baseline' line chart. Different "
                "source file from get_demand_series."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "store": {"type": "string"},
                    "sku": {"type": "string"},
                },
                "required": ["store"],
            },
        },
    },
]


def _find_store(data, name):
    stores = data.get('stores', {})
    norm = name.strip().lower()
    for store in stores.values():
        if store.get('name', '').strip().lower() == norm:
            return store
    return None


def _find_sku(store, name):
    norm = name.strip().lower()
    for sk in store.get('skus', []):
        if sk.get('name', '').strip().lower() == norm:
            return sk
    return None


def tool_list_stores(data, args):
    return {"stores": [s.get('name') for s in data.get('stores', {}).values()]}


def tool_list_skus(data, args):
    store = _find_store(data, args.get('store', ''))
    if not store:
        return {"error": f"No store found named '{args.get('store')}'"}
    only_inv = args.get('only_with_inventory', False)
    skus = store.get('skus', [])
    if only_inv:
        skus = [sk for sk in skus if sk.get('hasInv')]
    return {"skus": [sk.get('name') for sk in skus]}


def tool_list_customers(data, args):
    store = _find_store(data, args.get('store', ''))
    if not store:
        return {"error": f"No store found named '{args.get('store')}'"}
    inv_c = store.get('invCustomers') or []
    dem_c = store.get('demandCustomers') or []
    return {"customers": sorted(set(inv_c) | set(dem_c))}


def tool_get_sku_snapshot(data, args):
    store = _find_store(data, args.get('store', ''))
    if not store:
        return {"error": f"No store found named '{args.get('store')}'"}
    sku = _find_sku(store, args.get('sku', ''))
    if not sku:
        return {"error": f"No SKU found named '{args.get('sku')}' at {store.get('name')}"}
    if not sku.get('hasInv'):
        return {"error": f"No real inventory data loaded for {sku.get('name')} at {store.get('name')}"}
    return {
        "store": store.get('name'),
        "sku": sku.get('name'),
        "on_hand": sku.get('oh'),
        "safety_stock": sku.get('ss'),
        "rop": sku.get('rop'),
        "net_requirement": sku.get('nr'),
        "replenishment_quantity": sku.get('rq'),
        "status": sku.get('st'),
    }


def tool_list_flagged_skus(data, args):
    store = _find_store(data, args.get('store', ''))
    if not store:
        return {"error": f"No store found named '{args.get('store')}'"}
    # Case-insensitive: the model doesn't reliably preserve the exact enum
    # casing from its schema when the user's question capitalises the word
    # differently (e.g. "Redeploy" from natural language vs the schema's
    # lowercase "redeploy") -- an exact-match comparison here silently
    # returned zero matches for a real, populated status.
    status = str(args.get('status', '')).strip().lower()
    matches = [sk.get('name') for sk in store.get('skus', []) if sk.get('hasInv') and sk.get('st') == status]
    return {"store": store.get('name'), "status": status, "skus": matches, "count": len(matches)}


def tool_get_demand_series(data, args):
    store = _find_store(data, args.get('store', ''))
    if not store:
        return {"error": f"No store found named '{args.get('store')}'"}
    months = store.get('weekKeys', [])
    if args.get('sku'):
        sku = _find_sku(store, args['sku'])
        if not sku:
            return {"error": f"No SKU found named '{args['sku']}' at {store.get('name')}"}
        if not sku.get('hasDemand', True):
            return {"error": f"No demand-file data for {sku.get('name')} at {store.get('name')}"}
        return {"store": store.get('name'), "sku": sku.get('name'), "months": months,
                "baseline_forecast": sku.get('forecast'), "ai_sensed": sku.get('sensed'), "uplift_pct": sku.get('uplift')}
    return {"store": store.get('name'), "months": months,
            "baseline_forecast": store.get('forecast'), "ai_sensed": store.get('sensed'), "uplift_pct": store.get('uplift')}


def tool_get_sensing_series(data, args):
    store = _find_store(data, args.get('store', ''))
    if not store:
        return {"error": f"No store found named '{args.get('store')}'"}
    months = store.get('weekKeys', [])
    if args.get('sku'):
        sku = _find_sku(store, args['sku'])
        if not sku:
            return {"error": f"No SKU found named '{args['sku']}' at {store.get('name')}"}
        if not sku.get('hasSensing'):
            return {"error": f"No demand-sensing-file data for {sku.get('name')} at {store.get('name')}"}
        return {"store": store.get('name'), "sku": sku.get('name'), "months": months,
                "total_demand": sku.get('sensingForecast'), "sensed_forecast": sku.get('sensingSensed'), "uplift_pct": sku.get('sensingUplift')}
    if not store.get('hasSensing'):
        return {"error": f"No demand-sensing-file data for {store.get('name')}"}
    return {"store": store.get('name'), "months": months,
            "total_demand": store.get('sensingForecast'), "sensed_forecast": store.get('sensingSensed'), "uplift_pct": store.get('sensingUplift')}


TOOL_IMPL = {
    "list_stores": tool_list_stores,
    "list_skus": tool_list_skus,
    "list_customers": tool_list_customers,
    "get_sku_snapshot": tool_get_sku_snapshot,
    "list_flagged_skus": tool_list_flagged_skus,
    "get_demand_series": tool_get_demand_series,
    "get_sensing_series": tool_get_sensing_series,
}


def _call_openrouter(messages, api_key, model):
    body = json.dumps({
        "model": model,
        "messages": messages,
        "tools": TOOL_SCHEMAS,
    }).encode('utf-8')
    req = urllib.request.Request(
        OPENROUTER_URL,
        data=body,
        method='POST',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            # OpenRouter asks for these two for attribution/rankings; harmless to omit-safe defaults.
            'HTTP-Referer': 'http://127.0.0.1:8000',
            'X-Title': 'Decision Intelligence Cockpit',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', errors='replace')[:500]
        raise ChatError(f'OpenRouter HTTP {e.code}: {detail}')
    except urllib.error.URLError as e:
        raise ChatError(f'Could not reach OpenRouter: {e.reason}')


def handle_chat(user_message, history, data):
    """history: list of {role, content} from prior turns (no tool-call plumbing
    from earlier turns is replayed -- each turn resolves its own tool calls).
    data: the browser's parsed STORES snapshot, as JSON."""
    api_key = _read_config(API_KEY_FILE, 'OpenRouter API key')
    model = get_model()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-8:]:
        if h.get('role') in ('user', 'assistant') and h.get('content'):
            messages.append({"role": h['role'], "content": h['content']})
    messages.append({"role": "user", "content": user_message})

    MAX_TOOL_ROUNDS = 4
    print(f'[chat] Q: {user_message!r} (model={model})', flush=True)
    for round_i in range(MAX_TOOL_ROUNDS):
        resp = _call_openrouter(messages, api_key, model)
        if 'error' in resp:
            raise ChatError(f"OpenRouter error: {resp['error']}")
        choice = resp['choices'][0]
        msg = choice['message']
        tool_calls = msg.get('tool_calls')
        if not tool_calls:
            answer = msg.get('content', '').strip() or "(no answer returned)"
            print(f'[chat] -> answer (round {round_i}): {answer!r}', flush=True)
            return answer

        messages.append(msg)
        for tc in tool_calls:
            fn_name = tc['function']['name']
            try:
                fn_args = json.loads(tc['function'].get('arguments') or '{}')
            except json.JSONDecodeError:
                fn_args = {}
            impl = TOOL_IMPL.get(fn_name)
            result = impl(data, fn_args) if impl else {"error": f"Unknown tool '{fn_name}'"}
            print(f'[chat]   tool {fn_name}({fn_args}) -> {result}', flush=True)
            messages.append({
                "role": "tool",
                "tool_call_id": tc['id'],
                "content": json.dumps(result),
            })

    return "I wasn't able to settle on an answer within a reasonable number of tool calls -- try rephrasing the question."
