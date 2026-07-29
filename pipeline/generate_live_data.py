"""
generate_live_data.py
Reads Dabur_Supply_Data.xlsx → writes live_data.js
Run this script whenever the data team drops a new Excel file.
Output file is loaded by replenishment-cockpit-v5.html automatically.
"""
import sys, json, math
sys.stdout.reconfigure(encoding='utf-8')

import openpyxl
from pathlib import Path

EXCEL_PATH  = Path(__file__).parent.parent / 'Dabur_Supply_Data.xlsx'
OUTPUT_PATH = Path(__file__).parent.parent / 'live_data.js'

# Store master — max capacity and lead time (not in Excel yet; kept here)
STORE_MASTER = {
    '#0142': {'id': '0142', 'name': 'Dubai — UAE',           'maxCap': 1800, 'lead': 2, 'format': 'L'},
    '#0137': {'id': '0137', 'name': 'Riyadh — Saudi Arabia', 'maxCap': 1400, 'lead': 2, 'format': 'M'},
    '#0151': {'id': '0151', 'name': 'Cairo — Egypt',          'maxCap': 1500, 'lead': 2, 'format': 'M'},
    '#0165': {'id': '0165', 'name': 'Nairobi — Kenya',        'maxCap': 900,  'lead': 2, 'format': 'S'},
    '#0188': {'id': '0188', 'name': 'Lagos — Nigeria',        'maxCap': 1100, 'lead': 2, 'format': 'S'},
}

# Map Excel signal column names → signal chip labels
SIGNAL_MAP = {
    'Promo Units':    'Promo',
    'Weather Units':  'Weather',
    'Festival Units': 'Festival',
}

# ── READ EXCEL ────────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws_demand = wb['Demand Forecasting']
ws_inv    = wb['On Hand Inventory']

def read_sheet(ws):
    """Return list of dicts, using row 3 as header."""
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h).strip() if h else '' for h in rows[2]]  # row index 2 = row 3
    data = []
    for row in rows[3:]:
        if any(v is not None for v in row):
            data.append(dict(zip(headers, row)))
    return data

demand_rows = read_sheet(ws_demand)
inv_rows    = read_sheet(ws_inv)

# ── AGGREGATE DEMAND DATA ─────────────────────────────────────────────────────
# Build: store_id → week_index (0-7) → {baseline, promo, weather, festival}
from collections import defaultdict

demand_by_store_week = defaultdict(lambda: defaultdict(lambda: {
    'baseline': 0, 'promo': 0, 'weather': 0, 'festival': 0
}))

# Collect all unique week dates to build week index
week_dates_by_store = defaultdict(set)
for r in demand_rows:
    sid  = r.get('Store ID', '').strip()
    date = r.get('Week Start Date')
    if sid and date:
        week_dates_by_store[sid].add(date)

# Sort dates per store → gives week order
sorted_weeks = {}
for sid, dates in week_dates_by_store.items():
    sorted_weeks[sid] = sorted(dates)

for r in demand_rows:
    sid  = r.get('Store ID', '').strip()
    date = r.get('Week Start Date')
    if not sid or not date:
        continue
    week_idx = sorted_weeks[sid].index(date)
    d = demand_by_store_week[sid][week_idx]
    d['baseline']  += int(r.get('Baseline (units)') or 0)
    d['promo']     += int(r.get('Promo Units')      or 0)
    d['weather']   += int(r.get('Weather Units')    or 0)
    d['festival']  += int(r.get('Festival Units')   or 0)

# ── AGGREGATE INVENTORY DATA ──────────────────────────────────────────────────
inv_by_store = defaultdict(lambda: {
    'on_hand': 0, 'in_transit': 0, 'safety_stock': 0,
    'rop': 0, 'replen_qty': 0, 'net_req': 0,
    'skus': []
})

STATUS_ORDER = {'replenish': 0, 'low': 1, 'ok': 2, 'hold': 3, 'redeploy': 4}

def derive_status(on_hand, rop, net_req, weekly_demand):
    if net_req > 0 and on_hand < rop * 0.7:
        return 'low'
    if net_req > 0:
        return 'replenish'
    if weekly_demand > 0 and on_hand > weekly_demand * 6:
        return 'redeploy'
    if on_hand >= rop:
        return 'ok'
    return 'hold'

for r in inv_rows:
    sid = r.get('Store ID', '').strip()
    if not sid:
        continue
    oh  = int(r.get('On-Hand (units)')    or 0)
    it  = int(r.get('In-Transit (units)') or 0)
    ss  = int(r.get('Safety Stock')       or 0)
    rop = int(r.get('ROP')                or 0)
    rq  = int(r.get('Replenishment Qty')  or 0)
    nr  = int(r.get('Net Requirement')    or 0)
    sku_id   = str(r.get('SKU ID',   '') or '').strip()
    sku_name = str(r.get('SKU Name', '') or '').strip()

    # Week 0 demand = baseline from demand sheet week 0 / number_of_skus
    week0 = demand_by_store_week[sid][0]

    inv = inv_by_store[sid]
    inv['on_hand']      += oh
    inv['in_transit']   += it
    inv['safety_stock'] += ss
    inv['rop']          += rop
    inv['replen_qty']   += rq
    inv['net_req']      += nr

    # Weekly demand for this SKU (from demand sheet week 0)
    # Approximate: total week0 baseline / SKU count — we'll use per-sku baseline below
    sku_weekly_demand = 0
    for dr in demand_rows:
        if dr.get('Store ID','').strip() == sid and dr.get('SKU ID','').strip() == sku_id:
            sku_weekly_demand = int(dr.get('Baseline (units)') or 0)
            break

    status = derive_status(oh, rop, nr, sku_weekly_demand)
    inv['skus'].append({
        'id': sku_id, 'name': sku_name,
        'oh': oh, 'it': it, 'dmd': sku_weekly_demand,
        'ss': ss, 'rop': rop, 'nr': nr, 'rq': rq,
        'st': status
    })

# ── BUILD LIVE_STORES OUTPUT ──────────────────────────────────────────────────
LIVE_STORES = {}

for raw_sid, master in STORE_MASTER.items():
    sid_key = raw_sid                          # '#0142'
    js_key  = master['id']                     # '0142'
    max_cap = master['maxCap']
    lead    = master['lead']

    # 8-week demand arrays
    forecast_arr = []
    sensed_arr   = []
    for w in range(8):
        d = demand_by_store_week[sid_key][w]
        bl = d['baseline']
        sensed = bl + d['promo'] + d['weather'] + d['festival']
        forecast_arr.append(bl)
        sensed_arr.append(sensed)

    # Signals — compute uplift % per signal type from week 0
    w0 = demand_by_store_week[sid_key][0]
    bl0 = w0['baseline'] if w0['baseline'] else 1
    signals = [
        {'t': 'Promo',    'pct': round(w0['promo']    / bl0 * 100, 1), 'on': w0['promo']    > 0},
        {'t': 'Weather',  'pct': round(w0['weather']  / bl0 * 100, 1), 'on': w0['weather']  > 0},
        {'t': 'Festival', 'pct': round(w0['festival'] / bl0 * 100, 1), 'on': w0['festival'] > 0},
        {'t': 'Trend',    'pct': 0, 'on': False},
        {'t': 'Event',    'pct': 0, 'on': False},
    ]
    total_uplift_units = w0['promo'] + w0['weather'] + w0['festival']
    uplift = round(total_uplift_units / bl0 * 100, 1)

    # Inventory totals
    inv  = inv_by_store[sid_key]
    oh   = inv['on_hand']
    it   = inv['in_transit']
    rop  = inv['rop']
    rq   = inv['replen_qty']
    ots  = max(0, max_cap - oh - it)
    cap  = round(oh / max_cap * 100)

    # 8-week inventory gap projection
    # gap_w = running_stock - rop_total
    # Running stock starts at oh+it; each week draw down by sensed demand
    # Replenishment arrives at end of week 1 (2-day lead time from week 0 order)
    gap_arr = []
    running = oh + it
    for w in range(8):
        gap_val = running - rop
        gap_arr.append(int(gap_val))
        # Draw down by this week's sensed demand
        running -= sensed_arr[w]
        # Add replenishment in week 1 (if any was ordered)
        if w == 1:
            running += rq

    # KPI tile values (capacity utilisation from real data; others kept from hardcoded)
    cu_str = f'{cap}%'

    LIVE_STORES[js_key] = {
        'onHand':    oh,
        'inTransit': it,
        'ots':       ots,
        'capPct':    cap,
        'uplift':    uplift,
        'signals':   signals,
        'forecast':  forecast_arr,
        'sensed':    sensed_arr,
        'gap':       gap_arr,
        'rop':       rop,
        # KPI — only capacity utilisation can be derived from Excel data right now
        'kpisLive': {
            'cu':  cu_str,
            'it':  str(it),
            'itD': f'{sum(1 for s in inv["skus"] if s["it"] > 0)} SKUs in transit',
        },
        'skus':      inv['skus'],
    }

# ── WRITE live_data.js ────────────────────────────────────────────────────────
js_content = f"""/* AUTO-GENERATED — do not edit manually.
   Source: Dabur_Supply_Data.xlsx
   Run pipeline/generate_live_data.py to refresh.
*/
window.LIVE_STORES = {json.dumps(LIVE_STORES, indent=2)};
"""

OUTPUT_PATH.write_text(js_content, encoding='utf-8')
print(f'Written: {OUTPUT_PATH}')
for k, v in LIVE_STORES.items():
    active_sigs = [s['t'] for s in v['signals'] if s['on']]
    print(f"  Store {k}: onHand={v['onHand']}, inTransit={v['inTransit']}, "
          f"capPct={v['capPct']}%, uplift={v['uplift']}%, "
          f"signals={active_sigs}, SKUs={len(v['skus'])}")
