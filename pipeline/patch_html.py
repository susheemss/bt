"""
patch_html.py
Injects live_data.js reference and LIVE_STORES merge code into the HTML.
Run once — idempotent (checks if already patched before modifying).
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

HTML_IN  = 'd:/BT/replenishment-cockpit-v5.html'
HTML_OUT = 'd:/BT/replenishment-cockpit-v5.html'

with open(HTML_IN, encoding='utf-8') as f:
    html = f.read()

# ── Guard: skip if already patched ───────────────────────────────────────────
if 'live_data.js' in html:
    print('Already patched — nothing to do.')
    raise SystemExit(0)

# ── 1. Add <script src="live_data.js"> just before </head> ───────────────────
SCRIPT_TAG = '<script src="live_data.js"></script>\n'
html = html.replace('</head>', SCRIPT_TAG + '</head>', 1)
print('Step 1 done: added <script src="live_data.js"> before </head>')

# ── 2. Inject merge code right after STORES closes ───────────────────────────
# The STORES block ends with:  };\n\nlet currentStore=
STORES_END_MARKER = "};\n\nlet currentStore='0142'"

MERGE_BLOCK = """};\n
/* ── Live data merge (from live_data.js / Dabur_Supply_Data.xlsx) ─────────
   Overwrites: onHand, inTransit, ots, capPct, uplift, signals,
               forecast, sensed, gap, rop, skus, kpisLive
   Keeps hardcoded: kpis (SL/FR/TC until data team provides those tables),
                    aiRecs, coords, telMode, saving
──────────────────────────────────────────────────────────────────────── */
if (window.LIVE_STORES) {
  Object.keys(window.LIVE_STORES).forEach(function(storeId) {
    if (!STORES[storeId]) return;
    var live = window.LIVE_STORES[storeId];
    // Screen 1 — inventory & demand fields
    STORES[storeId].onHand    = live.onHand;
    STORES[storeId].inTransit = live.inTransit;
    STORES[storeId].ots       = live.ots;
    STORES[storeId].capPct    = live.capPct;
    STORES[storeId].uplift    = live.uplift;
    STORES[storeId].signals   = live.signals;
    STORES[storeId].forecast  = live.forecast;
    STORES[storeId].sensed    = live.sensed;
    STORES[storeId].gap       = live.gap;
    STORES[storeId].rop       = live.rop;
    // KPI tiles — partial update (only fields we can derive from Excel)
    if (live.kpisLive) {
      STORES[storeId].kpis.cu  = live.kpisLive.cu;
      STORES[storeId].kpis.it  = live.kpisLive.it;
      STORES[storeId].kpis.itD = live.kpisLive.itD;
    }
    // SKU table (Screen 2)
    if (live.skus && live.skus.length) {
      STORES[storeId].skus = live.skus;
    }
  });
  console.log('[Decision Intelligence] Live data loaded from Dabur_Supply_Data.xlsx');
}

let currentStore='0142'"""

if STORES_END_MARKER not in html:
    print('ERROR: could not find STORES end marker in HTML.')
    raise SystemExit(1)

html = html.replace(STORES_END_MARKER, MERGE_BLOCK, 1)
print('Step 2 done: injected LIVE_STORES merge block after STORES closes')

# ── Save ─────────────────────────────────────────────────────────────────────
with open(HTML_OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'Saved: {HTML_OUT}')
