"""
AI Assistant backend: takes a user question plus the browser's already-
parsed store/SKU data (the exact same object driving the charts -- no
second Excel parser here, one source of truth), gives an LLM a small fixed
set of tools that look up real values from that data, and returns the
model's final answer.

Talks to any OpenAI-compatible chat-completions endpoint -- by default a
locally-running LM Studio server (http://127.0.0.1:1234), so this needs no
API key and no internet access at all. Still works with a real hosted
provider (OpenRouter, etc.) if you point llm_base_url.txt and
openrouter_api_key.txt at one instead -- nothing here is LM-Studio-specific
beyond the default URL. Only Python's standard library is used -- no pip
install needed either way.

Config (plain text files next to this one, first line only, all optional):
  llm_base_url.txt        -- full chat-completions URL to call. Defaults to
                              LM Studio's local server if this file is
                              missing (see DEFAULT_LLM_BASE_URL below).
  openrouter_model.txt    -- which model id to send. LM Studio ignores this
                              and just uses whatever model is loaded in its
                              UI, so it rarely needs to be accurate; matters
                              more if base_url points at a real hosted API.
  openrouter_api_key.txt  -- bearer token, only needed for a hosted API
                              that requires one (gitignored). LM Studio
                              doesn't check this at all -- if the file is
                              missing, no Authorization header is sent.
"""
import json
import urllib.request
import urllib.error
from pathlib import Path

APP_DIR = Path(__file__).parent
API_KEY_FILE = APP_DIR / 'openrouter_api_key.txt'
MODEL_FILE = APP_DIR / 'openrouter_model.txt'
BASE_URL_FILE = APP_DIR / 'llm_base_url.txt'
# Local-first: a model running on the same machine via LM Studio, no key,
# no internet call. Point llm_base_url.txt at a hosted API instead if you
# want to go back to that.
DEFAULT_LLM_BASE_URL = 'http://127.0.0.1:1234/v1/chat/completions'
DEFAULT_MODEL = 'local-model'

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


def _read_optional(path, default):
    """Returns the file's first-line content, or `default` if the file is
    missing or empty -- every one of this module's config files is optional
    now that the default backend (LM Studio) needs no key and has a fixed
    well-known local URL."""
    if path.is_file():
        val = path.read_text(encoding='utf-8').strip()
        if val:
            return val
    return default


def get_model():
    return _read_optional(MODEL_FILE, DEFAULT_MODEL)


def get_base_url():
    return _read_optional(BASE_URL_FILE, DEFAULT_LLM_BASE_URL)


def get_api_key():
    """None (not an error) when no key file exists -- a local LM Studio
    server doesn't check for one at all."""
    return _read_optional(API_KEY_FILE, None)


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


# ════════════════════════════════════════════════════════════════
# REDEPLOY-MATCHING AGENT -- a second, narrower agent with its own fixed
# task and its own small toolset (kept separate from TOOL_SCHEMAS/TOOL_IMPL
# above so the general Q&A assistant's behavior is unchanged). The model
# decides WHICH SKUs are worth matching and WHY; the transfer quantity
# itself always comes from get_redeploy_match's own computation below, never
# from the model's own arithmetic -- same "tool-calling only, never state a
# number you didn't get from a tool" rule the rest of this file follows.
# ════════════════════════════════════════════════════════════════

REDEPLOY_SYSTEM_PROMPT = (
    "You are a network redeployment analyst for a supply-chain cockpit covering "
    "several stores. Your task: find real opportunities to move overstocked "
    "inventory from one store to another store that is short on the exact same "
    "SKU, instead of that store placing a new replenishment order.\n\n"
    "Method, in order:\n"
    "1. Call list_overstock_skus to see every SKU flagged Redeploy (real surplus "
    "above ROP) across all stores.\n"
    "2. Call list_shortfall_skus to see every SKU flagged Replenish or Low (real "
    "net requirement) across all stores.\n"
    "3. Match SKU names that appear in BOTH lists at DIFFERENT stores.\n"
    "4. For every match worth reporting, call get_redeploy_match with the exact "
    "sku / source_store / target_store to get the verified transfer quantity. "
    "Never compute or state a transfer quantity yourself -- always get it from "
    "this tool, and only report the number it returns.\n"
    "5. When a SKU's surplus could cover more than one shortfall store, prefer "
    "the store whose status is 'low' (more urgent) over 'replenish'.\n\n"
    "Present the result as a short markdown bullet list, one line per "
    "recommended transfer: SKU, from store, to store, suggested quantity, and "
    "a short reason (e.g. target status). If a SKU is overstocked with no "
    "matching shortfall anywhere, or a shortfall has no matching overstock "
    "anywhere, leave it out rather than forcing a match. If there are no "
    "matches at all, say so plainly, in one short sentence of prose -- don't "
    "invent one. Always answer in plain prose/markdown text. Never answer "
    "with a raw JSON object or a code block, even when the result is empty."
)

TOOL_SCHEMAS_REDEPLOY = [
    {
        "type": "function",
        "function": {
            "name": "list_overstock_skus",
            "description": (
                "List every SKU across all stores currently flagged Redeploy "
                "(overstocked), with its real on-hand, ROP and surplus "
                "(on-hand minus ROP)."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_shortfall_skus",
            "description": (
                "List every SKU across all stores currently flagged Replenish "
                "or Low, with its real net requirement and status."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_redeploy_match",
            "description": (
                "Given one SKU, a source store (where it's overstocked) and a "
                "target store (where it's short), returns the verified real "
                "surplus, shortfall and suggested transfer quantity -- the "
                "smaller of the two, computed here, not by you."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sku": {"type": "string", "description": "Exact SKU name"},
                    "source_store": {"type": "string", "description": "Store with the surplus"},
                    "target_store": {"type": "string", "description": "Store with the shortfall"},
                },
                "required": ["sku", "source_store", "target_store"],
            },
        },
    },
]


def tool_list_overstock_skus(data, args):
    out = []
    for store in data.get('stores', {}).values():
        for sk in store.get('skus', []):
            if not sk.get('hasInv') or sk.get('st') != 'redeploy':
                continue
            oh, rop = sk.get('oh') or 0, sk.get('rop') or 0
            surplus = oh - rop
            if surplus > 0:
                out.append({
                    "store": store.get('name'), "sku": sk.get('name'),
                    "on_hand": oh, "rop": rop, "surplus": surplus,
                })
    return {"overstock": out, "count": len(out)}


def tool_list_shortfall_skus(data, args):
    out = []
    for store in data.get('stores', {}).values():
        for sk in store.get('skus', []):
            if not sk.get('hasInv') or sk.get('st') not in ('replenish', 'low'):
                continue
            nr = sk.get('nr') or 0
            if nr > 0:
                out.append({
                    "store": store.get('name'), "sku": sk.get('name'),
                    "net_requirement": nr, "status": sk.get('st'),
                })
    return {"shortfall": out, "count": len(out)}


def tool_get_redeploy_match(data, args):
    source = _find_store(data, args.get('source_store', ''))
    if not source:
        return {"error": f"No store found named '{args.get('source_store')}'"}
    target = _find_store(data, args.get('target_store', ''))
    if not target:
        return {"error": f"No store found named '{args.get('target_store')}'"}
    sku_name = args.get('sku', '')
    src_sku, tgt_sku = _find_sku(source, sku_name), _find_sku(target, sku_name)
    if not src_sku:
        return {"error": f"No SKU found named '{sku_name}' at {source.get('name')}"}
    if not tgt_sku:
        return {"error": f"No SKU found named '{sku_name}' at {target.get('name')}"}
    if not src_sku.get('hasInv') or not tgt_sku.get('hasInv'):
        return {"error": f"Missing real inventory data for '{sku_name}' at one of these stores"}
    surplus = (src_sku.get('oh') or 0) - (src_sku.get('rop') or 0)
    shortfall = tgt_sku.get('nr') or 0
    return {
        "sku": sku_name,
        "source_store": source.get('name'), "source_on_hand": src_sku.get('oh'),
        "source_rop": src_sku.get('rop'), "source_surplus": surplus,
        "target_store": target.get('name'), "target_status": tgt_sku.get('st'),
        "target_net_requirement": shortfall,
        "suggested_transfer_qty": max(0, min(surplus, shortfall)),
    }


TOOL_IMPL_REDEPLOY = {
    "list_overstock_skus": tool_list_overstock_skus,
    "list_shortfall_skus": tool_list_shortfall_skus,
    "get_redeploy_match": tool_get_redeploy_match,
}


def _call_llm(messages, tools, base_url, api_key, model):
    body = json.dumps({
        "model": model,
        "messages": messages,
        "tools": tools,
    }).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    # Only sent when a key is actually configured -- a local LM Studio server
    # doesn't check for one at all, and sending a fake one is unnecessary.
    if api_key:
        headers['Authorization'] = f'Bearer {api_key}'
    req = urllib.request.Request(base_url, data=body, method='POST', headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', errors='replace')[:500]
        raise ChatError(f'LLM backend HTTP {e.code} ({base_url}): {detail}')
    except urllib.error.URLError as e:
        raise ChatError(
            f'Could not reach the LLM backend at {base_url} ({e.reason}). '
            f'If this is meant to be LM Studio, check it\'s running and the local server is started.'
        )


def _run_tool_loop(messages, tools, tool_impl, data, base_url, api_key, model, max_rounds, log_prefix):
    """Shared agent loop: call the model, execute whatever tool calls it asks
    for against the real data, feed the results back, repeat until it gives a
    final text answer (or the round budget runs out). Used by both the
    general chat assistant and the redeploy-matching agent -- same loop,
    different system prompt / toolset / task."""
    print(f'[{log_prefix}] starting (model={model}, backend={base_url})', flush=True)
    for round_i in range(max_rounds):
        resp = _call_llm(messages, tools, base_url, api_key, model)
        if 'error' in resp:
            raise ChatError(f"LLM backend error: {resp['error']}")
        choice = resp['choices'][0]
        msg = choice['message']
        tool_calls = msg.get('tool_calls')
        if not tool_calls:
            answer = msg.get('content', '').strip() or "(no answer returned)"
            print(f'[{log_prefix}] -> answer (round {round_i}): {answer!r}', flush=True)
            return answer

        messages.append(msg)
        for tc in tool_calls:
            fn_name = tc['function']['name']
            try:
                fn_args = json.loads(tc['function'].get('arguments') or '{}')
            except json.JSONDecodeError:
                fn_args = {}
            impl = tool_impl.get(fn_name)
            result = impl(data, fn_args) if impl else {"error": f"Unknown tool '{fn_name}'"}
            print(f'[{log_prefix}]   tool {fn_name}({fn_args}) -> {result}', flush=True)
            messages.append({
                "role": "tool",
                "tool_call_id": tc['id'],
                "content": json.dumps(result),
            })

    return "I wasn't able to settle on an answer within a reasonable number of tool calls -- try rephrasing the question."


def handle_chat(user_message, history, data):
    """history: list of {role, content} from prior turns (no tool-call plumbing
    from earlier turns is replayed -- each turn resolves its own tool calls).
    data: the browser's parsed STORES snapshot, as JSON."""
    base_url = get_base_url()
    api_key = get_api_key()
    model = get_model()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-8:]:
        if h.get('role') in ('user', 'assistant') and h.get('content'):
            messages.append({"role": h['role'], "content": h['content']})
    messages.append({"role": "user", "content": user_message})

    return _run_tool_loop(messages, TOOL_SCHEMAS, TOOL_IMPL, data, base_url, api_key, model, max_rounds=4, log_prefix='chat')


def handle_redeploy_agent(data):
    """Runs the redeploy-matching agent's fixed task once (no user question,
    no conversation history -- it's a standalone analysis, not a chat turn)
    and returns its markdown answer. data: the browser's parsed STORES
    snapshot, same shape handle_chat receives."""
    base_url = get_base_url()
    api_key = get_api_key()
    model = get_model()

    messages = [
        {"role": "system", "content": REDEPLOY_SYSTEM_PROMPT},
        {"role": "user", "content": "Find redeploy opportunities across the network right now."},
    ]
    return _run_tool_loop(messages, TOOL_SCHEMAS_REDEPLOY, TOOL_IMPL_REDEPLOY, data, base_url, api_key, model, max_rounds=8, log_prefix='redeploy')
