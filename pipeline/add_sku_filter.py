"""
add_sku_filter.py
Adds a SKU-level filter to the Overview screen.
- SKU dropdown next to the store selector in the top nav
- Per-SKU forecast/sensed/gap data stored separately after upload
- renderAllCharts intercepted to apply filter before drawing
Run once — idempotent.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

HTML_PATH = 'd:/BT/replenishment-cockpit-v5.html'
with open(HTML_PATH, encoding='utf-8') as f:
    html = f.read()

if 'skuFilterSelect' in html:
    print('SKU filter already present — nothing to do.')
    raise SystemExit(0)

# ══════════════════════════════════════════════════════════════════════════════
# 1. CSS for SKU filter dropdown
# ══════════════════════════════════════════════════════════════════════════════
SKU_CSS = """
/* ── SKU filter ─── */
#sku-filter-node{display:none}   /* hidden until data is uploaded */
#sku-filter-node.visible{display:flex}
.sku-filter-badge{
  font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;
  background:var(--purple-light);color:var(--purple);margin-left:4px;display:none;
}
.sku-filter-badge.on{display:inline}
"""
html = html.replace('</style>', SKU_CSS + '\n</style>', 1)
print('Step 1: CSS added')

# ══════════════════════════════════════════════════════════════════════════════
# 2. Add SKU dropdown HTML — after the store selector node in the top nav
# ══════════════════════════════════════════════════════════════════════════════
SKU_DROPDOWN_HTML = """    <!-- SKU filter -->
    <div class="tnav-node" id="sku-filter-node">
      <span class="tnav-node-lbl">SKU</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8592A3" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
      <select id="skuFilterSelect" onchange="selectSkuFilter(this.value)" style="appearance:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:12px;color:var(--ink);background:transparent;cursor:pointer;font-weight:600;max-width:200px">
        <option value="all">All Items</option>
      </select>
    </div>
"""

# Inject after the store selector closing div
html = html.replace(
    '    <!-- Divider -->\n    <div class="tnav-sep"></div>\n    <!-- Alert bell -->',
    SKU_DROPDOWN_HTML + '    <!-- Divider -->\n    <div class="tnav-sep"></div>\n    <!-- Alert bell -->',
    1
)
print('Step 2: SKU dropdown HTML added')

# ══════════════════════════════════════════════════════════════════════════════
# 3. Inject SKU filter JS (before closing </script>)
# ══════════════════════════════════════════════════════════════════════════════
SKU_JS = r"""
/* ════════════════════════════════════════════════════════════════
   SKU FILTER — per-SKU chart drill-down on the Overview screen
════════════════════════════════════════════════════════════════ */

let currentSkuFilter = 'all';

/* ── Store per-SKU data after upload ─────────────────────── */
// window.DH_SKU_DATA['0142']['SKU-4471'] = {forecast, sensed, gap, uplift, oh, it, rop, rq}
// window.DH_AGG_DATA['0142']             = {forecast, sensed, gap, uplift, onHand, inTransit, ...}

function dhBuildSkuData(wb, liveStores) {
  /* Build per-SKU demand buckets from the raw workbook.
     Called after dhAggregateData so weekIdx is already computed there.
     We re-parse the sheets here independently for clarity. */
  const demandRows = XLSX.utils.sheet_to_json(wb.Sheets['Demand Forecasting'], {range:2, defval:0});
  const invRows    = XLSX.utils.sheet_to_json(wb.Sheets['On Hand Inventory'],   {range:2, defval:0});

  // Build weekIdx per store (same as dhAggregateData)
  const weekDates = {};
  demandRows.forEach(r => {
    const sid  = (r['Store ID']||'').trim();
    const date = r['Week Start Date'];
    if(!sid || !date) return;
    if(!weekDates[sid]) weekDates[sid] = new Set();
    const ds = typeof date==='object' ? date.toISOString().slice(0,10) : String(date).slice(0,10);
    weekDates[sid].add(ds);
  });
  const weekIdxMap = {};
  Object.keys(weekDates).forEach(sid => {
    const sorted = Array.from(weekDates[sid]).sort();
    weekIdxMap[sid] = {};
    sorted.forEach((d,i) => weekIdxMap[sid][d] = i);
  });

  // Per-SKU demand bucket: storeRawId → skuId → weekIdx → {bl,pr,we,fe}
  const skuBucket = {};
  demandRows.forEach(r => {
    const sid   = (r['Store ID']||'').trim();
    const skuId = (r['SKU ID']||'').trim();
    const date  = r['Week Start Date'];
    if(!sid || !skuId || !date) return;
    const ds = typeof date==='object' ? date.toISOString().slice(0,10) : String(date).slice(0,10);
    const wi = weekIdxMap[sid]?.[ds];
    if(wi === undefined) return;
    if(!skuBucket[sid])       skuBucket[sid] = {};
    if(!skuBucket[sid][skuId])skuBucket[sid][skuId] = {};
    if(!skuBucket[sid][skuId][wi]) skuBucket[sid][skuId][wi] = {bl:0,pr:0,we:0,fe:0};
    skuBucket[sid][skuId][wi].bl += Number(r['Baseline (units)']||0);
    skuBucket[sid][skuId][wi].pr += Number(r['Promo Units']||0);
    skuBucket[sid][skuId][wi].we += Number(r['Weather Units']||0);
    skuBucket[sid][skuId][wi].fe += Number(r['Festival Units']||0);
  });

  // Per-SKU inventory lookup: storeRawId → skuId → {oh,it,ss,rop,rq,nr,name}
  const invLookup = {};
  invRows.forEach(r => {
    const sid   = (r['Store ID']||'').trim();
    const skuId = (r['SKU ID']||'').trim();
    if(!sid || !skuId) return;
    if(!invLookup[sid]) invLookup[sid] = {};
    invLookup[sid][skuId] = {
      name: String(r['SKU Name']||'').trim(),
      oh:   Number(r['On-Hand (units)']||0),
      it:   Number(r['In-Transit (units)']||0),
      ss:   Number(r['Safety Stock']||0),
      rop:  Number(r['ROP']||0),
      rq:   Number(r['Replenishment Qty']||0),
      nr:   Number(r['Net Requirement']||0),
    };
  });

  window.DH_SKU_DATA = {};
  window.DH_AGG_DATA = {};

  Object.entries(DH_STORE_MASTER).forEach(([rawSid, master]) => {
    const jsKey = master.id;

    // Save aggregate data for "All Items" restore
    if(liveStores[jsKey]) {
      window.DH_AGG_DATA[jsKey] = {
        forecast:  liveStores[jsKey].forecast.slice(),
        sensed:    liveStores[jsKey].sensed.slice(),
        gap:       liveStores[jsKey].gap.slice(),
        uplift:    liveStores[jsKey].uplift,
        onHand:    liveStores[jsKey].onHand,
        inTransit: liveStores[jsKey].inTransit,
        ots:       liveStores[jsKey].ots,
        capPct:    liveStores[jsKey].capPct,
        rop:       liveStores[jsKey].rop,
        kpisLive:  liveStores[jsKey].kpisLive,
      };
    }

    window.DH_SKU_DATA[jsKey] = {};
    const storeSku = skuBucket[rawSid] || {};
    const storeInv = invLookup[rawSid] || {};

    Object.keys(storeSku).forEach(skuId => {
      const skuWeeks = storeSku[skuId];
      const numWeeks = Object.keys(skuWeeks).length;
      const inv      = storeInv[skuId] || {oh:0,it:0,ss:0,rop:0,rq:0,nr:0,name:skuId};

      const forecast = [], sensed = [];
      for(let w=0; w<numWeeks; w++){
        const d = skuWeeks[w] || {bl:0,pr:0,we:0,fe:0};
        forecast.push(d.bl);
        sensed.push(d.bl + d.pr + d.we + d.fe);
      }

      // 8-week gap for this SKU
      const gap = [];
      let running = inv.oh + inv.it;
      for(let w=0; w<numWeeks; w++){
        gap.push(Math.round(running - inv.rop));
        running -= sensed[w];
        if(w===1) running += inv.rq;
      }

      const w0  = skuWeeks[0] || {bl:1,pr:0,we:0,fe:0};
      const bl0 = w0.bl || 1;
      const skuUplift = Math.round((w0.pr+w0.we+w0.fe)/bl0*1000)/10;

      window.DH_SKU_DATA[jsKey][skuId] = {
        name:     inv.name || skuId,
        forecast, sensed, gap,
        uplift:   skuUplift,
        oh: inv.oh, it: inv.it, ss: inv.ss,
        rop: inv.rop, rq: inv.rq, nr: inv.nr,
      };
    });
  });

  console.log('[SKU Filter] Per-SKU data built for', Object.keys(window.DH_SKU_DATA).length, 'stores');
}

function dhPopulateSkuDropdown(liveStores) {
  /* Populate the SKU dropdown from the first store's SKU list
     (same SKUs exist across all stores in the dataset) */
  const firstKey = Object.keys(liveStores)[0];
  const skus     = liveStores[firstKey]?.skus || [];
  const sel      = $id('skuFilterSelect');
  while(sel.options.length > 1) sel.remove(1);
  skus.forEach(sku => {
    const opt = document.createElement('option');
    opt.value = sku.id;
    opt.textContent = sku.name;
    sel.appendChild(opt);
  });
  // Show the dropdown (hidden until data loaded)
  $id('sku-filter-node').classList.add('visible');
  // Reset to "All Items"
  sel.value = 'all';
  currentSkuFilter = 'all';
}

/* ── Apply / clear SKU filter to STORES ─────────────────── */
function applySkuFilterToStores(storeId) {
  if(!window.DH_AGG_DATA || !window.DH_AGG_DATA[storeId]) return; // no live data yet

  if(currentSkuFilter === 'all') {
    // Restore store-level aggregate
    const agg = window.DH_AGG_DATA[storeId];
    STORES[storeId].forecast  = agg.forecast;
    STORES[storeId].sensed    = agg.sensed;
    STORES[storeId].gap       = agg.gap;
    STORES[storeId].uplift    = agg.uplift;
    STORES[storeId].onHand    = agg.onHand;
    STORES[storeId].inTransit = agg.inTransit;
    STORES[storeId].ots       = agg.ots;
    STORES[storeId].capPct    = agg.capPct;
    if(agg.kpisLive) {
      STORES[storeId].kpis.cu  = agg.kpisLive.cu;
      STORES[storeId].kpis.it  = agg.kpisLive.it;
      STORES[storeId].kpis.itD = agg.kpisLive.itD;
    }
  } else {
    // Apply SKU-specific data
    const skuData = window.DH_SKU_DATA?.[storeId]?.[currentSkuFilter];
    if(!skuData) return;
    STORES[storeId].forecast  = skuData.forecast;
    STORES[storeId].sensed    = skuData.sensed;
    STORES[storeId].gap       = skuData.gap;
    STORES[storeId].uplift    = skuData.uplift;
    // KPI tile: in-transit for this SKU only
    STORES[storeId].kpis.it  = String(skuData.it);
    STORES[storeId].kpis.itD = skuData.it > 0 ? 'units in transit for this SKU' : 'none in transit';
    // Capacity utilisation stays at store level (SKU-level cap doesn't apply)
  }
}

/* Intercept renderAllCharts so the filter is always applied first */
(function(){
  const _orig = renderAllCharts;
  renderAllCharts = function(id){
    applySkuFilterToStores(id);
    _orig.call(this, id);
  };
})();

/* ── Public: called by dropdown onchange ─────────────────── */
function selectSkuFilter(skuId) {
  currentSkuFilter = skuId;

  // Update badge label in chart panel headers (if they exist)
  const badge = document.getElementById('sku-active-badge');
  if(badge){
    badge.textContent = skuId === 'all' ? '' : (window.DH_SKU_DATA?.[currentStore]?.[skuId]?.name || skuId);
    badge.className   = 'sku-filter-badge' + (skuId !== 'all' ? ' on' : '');
  }

  // Re-render overview
  applySkuFilterToStores(currentStore);
  renderAllCharts(currentStore);
  updateKPIs(currentStore);
}
/* ── end SKU filter ──────────────────────────────────────── */
"""

# Inject JS right before the last </script> before </body>
html = html.replace('\n</script>\n</body>', SKU_JS + '\n</script>\n</body>', 1)
print('Step 3: SKU filter JS added')

# ══════════════════════════════════════════════════════════════════════════════
# 4. Wire dhBuildSkuData into dhProcessFile (called after dhApplyToStores)
# ══════════════════════════════════════════════════════════════════════════════
html = html.replace(
    'dhApplyToStores(liveStores);\n      dhRenderSummary(liveStores, file.name);',
    'dhApplyToStores(liveStores);\n      dhBuildSkuData(wb, liveStores);\n      dhPopulateSkuDropdown(liveStores);\n      dhRenderSummary(liveStores, file.name);',
    1
)
print('Step 4: dhBuildSkuData wired into dhProcessFile')

# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'Saved: {HTML_PATH}')
