"""
add_datahub.py
Adds a Data Hub screen to replenishment-cockpit-v5.html.
- Adds SheetJS CDN script tag
- Adds Data Hub nav tab
- Adds Data Hub screen HTML
- Adds JS parsing + aggregation logic
Run once — idempotent.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

HTML_PATH = 'd:/BT/replenishment-cockpit-v5.html'
with open(HTML_PATH, encoding='utf-8') as f:
    html = f.read()

if 'tab-datahub' in html:
    print('Data Hub already present — nothing to do.')
    raise SystemExit(0)

# ══════════════════════════════════════════════════════════════════════════════
# 1. ADD SHEETJS CDN  (just before live_data.js)
# ══════════════════════════════════════════════════════════════════════════════
html = html.replace(
    '<script src="live_data.js"></script>',
    '<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>\n<script src="live_data.js"></script>',
    1
)
print('Step 1: SheetJS CDN added')

# ══════════════════════════════════════════════════════════════════════════════
# 2. ADD CSS FOR DATA HUB SCREEN
# ══════════════════════════════════════════════════════════════════════════════
DH_CSS = """
/* ── Data Hub ─────────────────────────────────────────────── */
.dh-wrap{max-width:900px;margin:0 auto;padding:32px 0}
.dh-title{font-size:18px;font-weight:700;color:var(--ink);margin-bottom:4px}
.dh-sub{font-size:13px;color:var(--ink3);margin-bottom:28px}
.dh-zone{
  border:2px dashed var(--border2);
  border-radius:var(--radius-lg);
  padding:52px 32px;
  text-align:center;
  background:var(--surface);
  cursor:pointer;
  transition:border-color .2s,background .2s;
  position:relative;
}
.dh-zone.drag-over{border-color:var(--blue);background:var(--blue-light)}
.dh-zone-icon{font-size:40px;margin-bottom:14px}
.dh-zone-label{font-size:15px;font-weight:600;color:var(--ink2);margin-bottom:6px}
.dh-zone-hint{font-size:12px;color:var(--ink4)}
.dh-zone-hint strong{color:var(--blue)}
.dh-file-input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.dh-status{margin-top:20px;padding:12px 16px;border-radius:var(--radius);font-size:13px;display:none}
.dh-status.processing{background:var(--blue-light);color:var(--blue-dark);display:block}
.dh-status.success{background:var(--green-light);color:var(--green);display:block}
.dh-status.error{background:var(--red-light);color:var(--red);display:block}
.dh-summary{margin-top:28px;display:none}
.dh-summary.visible{display:block}
.dh-summary-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.dh-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px}
.dh-card-val{font-size:22px;font-weight:700;color:var(--ink);margin-bottom:2px}
.dh-card-lbl{font-size:11px;color:var(--ink4);font-weight:500;text-transform:uppercase;letter-spacing:.05em}
.dh-table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:24px}
.dh-table-title{padding:14px 18px;font-size:13px;font-weight:600;color:var(--ink2);border-bottom:1px solid var(--border);background:var(--surface2)}
.dh-table{width:100%;border-collapse:collapse;font-size:12px}
.dh-table th{padding:9px 14px;text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ink4);border-bottom:1px solid var(--border);background:var(--surface2)}
.dh-table td{padding:10px 14px;border-bottom:1px solid var(--border);color:var(--ink2)}
.dh-table tr:last-child td{border-bottom:none}
.dh-table tr:hover td{background:var(--surface2)}
.dh-actions{display:flex;gap:10px;margin-top:4px}
.dh-timestamp{font-size:11px;color:var(--ink4);margin-top:20px;text-align:right}
.dh-signal-chips{display:flex;gap:4px;flex-wrap:wrap}
.dh-chip{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;background:var(--blue-light);color:var(--blue-dark)}
"""
html = html.replace('</style>', DH_CSS + '\n</style>', 1)
print('Step 2: Data Hub CSS added')

# ══════════════════════════════════════════════════════════════════════════════
# 3. ADD DATA HUB NAV TAB
# ══════════════════════════════════════════════════════════════════════════════
html = html.replace(
    '<div class="tnav-tab" id="nav-dispatch" onclick="showScreen(\'dispatch\')">Replenishment</div>',
    '<div class="tnav-tab" id="nav-dispatch" onclick="showScreen(\'dispatch\')">Replenishment</div>\n    <div class="tnav-sep"></div>\n    <div class="tnav-tab" id="nav-datahub" onclick="showScreen(\'datahub\')" style="color:var(--purple);gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Data Hub</div>',
    1
)
print('Step 3: Data Hub tab added')

# ══════════════════════════════════════════════════════════════════════════════
# 4. ADD DATA HUB SCREEN HTML (before </div><!-- /main -->)
# ══════════════════════════════════════════════════════════════════════════════
DH_SCREEN = """
<!-- ════════ DATA HUB SCREEN ════════ -->
<div class="tab-content" id="tab-datahub">
<div class="content">
  <div class="dh-wrap">
    <div class="dh-title">Data Hub</div>
    <div class="dh-sub">Upload the data team's Excel file to refresh the dashboard with live supply chain data.</div>

    <!-- Upload zone -->
    <div class="dh-zone" id="dh-zone"
         ondragover="dhDragOver(event)" ondragleave="dhDragLeave(event)" ondrop="dhDrop(event)"
         onclick="document.getElementById('dh-file-input').click()">
      <input type="file" id="dh-file-input" class="dh-file-input" accept=".xlsx,.xls"
             onchange="dhFileSelected(event)" onclick="event.stopPropagation()">
      <div class="dh-zone-icon">📂</div>
      <div class="dh-zone-label">Drop your Excel file here, or click to browse</div>
      <div class="dh-zone-hint">Accepts <strong>Dabur_Supply_Data.xlsx</strong> · Sheets required: <em>Demand Forecasting</em> &amp; <em>On Hand Inventory</em></div>
    </div>

    <!-- Status message -->
    <div class="dh-status" id="dh-status"></div>

    <!-- Summary (shown after successful upload) -->
    <div class="dh-summary" id="dh-summary">
      <div class="dh-summary-cards" id="dh-summary-cards"></div>
      <div class="dh-table-wrap">
        <div class="dh-table-title">Loaded data — per store</div>
        <table class="dh-table" id="dh-store-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>On-Hand</th>
              <th>In-Transit</th>
              <th>Cap. Util.</th>
              <th>Uplift</th>
              <th>Active Signals</th>
              <th>SKUs loaded</th>
              <th>Weeks</th>
            </tr>
          </thead>
          <tbody id="dh-store-tbody"></tbody>
        </table>
      </div>
      <div class="dh-actions">
        <button class="btn-primary" onclick="showScreen('overview')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          View Overview Dashboard
        </button>
        <button class="btn-secondary" onclick="document.getElementById('dh-file-input').click()">Upload New File</button>
      </div>
      <div class="dh-timestamp" id="dh-timestamp"></div>
    </div>
  </div>
</div>
</div>
"""

html = html.replace('\n</div><!-- /main -->', DH_SCREEN + '\n</div><!-- /main -->', 1)
print('Step 4: Data Hub screen HTML added')

# ══════════════════════════════════════════════════════════════════════════════
# 5. ADD JAVASCRIPT — parsing + aggregation + merge
# ══════════════════════════════════════════════════════════════════════════════
DH_JS = r"""
/* ════════════════════════════════════════════════════════════════
   DATA HUB — Excel upload, parse, aggregate, update STORES
════════════════════════════════════════════════════════════════ */

const DH_STORE_MASTER = {
  '#0142': {id:'0142', name:'Dubai — UAE',           maxCap:1800, lead:2},
  '#0137': {id:'0137', name:'Riyadh — Saudi Arabia', maxCap:1400, lead:2},
  '#0151': {id:'0151', name:'Cairo — Egypt',          maxCap:1500, lead:2},
  '#0165': {id:'0165', name:'Nairobi — Kenya',        maxCap:900,  lead:2},
  '#0188': {id:'0188', name:'Lagos — Nigeria',        maxCap:1100, lead:2},
};

function dhDragOver(e){e.preventDefault();$id('dh-zone').classList.add('drag-over')}
function dhDragLeave(e){$id('dh-zone').classList.remove('drag-over')}
function dhDrop(e){
  e.preventDefault();
  $id('dh-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file) dhProcessFile(file);
}
function dhFileSelected(e){
  const file = e.target.files[0];
  if(file) dhProcessFile(file);
}

function dhSetStatus(msg, type){
  const el = $id('dh-status');
  el.textContent = msg;
  el.className = 'dh-status ' + type;
}

function dhProcessFile(file){
  dhSetStatus('Reading ' + file.name + ' …', 'processing');
  $id('dh-summary').classList.remove('visible');
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const wb = XLSX.read(e.target.result, {type:'array', cellDates:true});
      const required = ['Demand Forecasting','On Hand Inventory'];
      const missing = required.filter(s => !wb.SheetNames.includes(s));
      if(missing.length){
        dhSetStatus('Missing sheets: ' + missing.join(', ') + '. Check your Excel file.', 'error');
        return;
      }
      dhSetStatus('Parsing data…', 'processing');
      setTimeout(function(){
        try {
          const liveStores = dhAggregateData(wb);
          dhApplyToStores(liveStores);
          dhRenderSummary(liveStores, file.name);
          dhSetStatus('✓ Data loaded successfully from ' + file.name, 'success');
        } catch(err){
          dhSetStatus('Error processing data: ' + err.message, 'error');
          console.error(err);
        }
      }, 50);
    } catch(err){
      dhSetStatus('Could not read file: ' + err.message, 'error');
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function dhSheetToRows(wb, sheetName){
  /* SheetJS: range:2 skips 2 title rows, uses row 3 as header */
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, {range:2, defval:0});
}

function dhAggregateData(wb){
  const demandRows = dhSheetToRows(wb, 'Demand Forecasting');
  const invRows    = dhSheetToRows(wb, 'On Hand Inventory');

  /* ── Build demand: storeId → weekIndex → {baseline, promo, weather, festival} */
  const demandMap  = {};   // '#0142' → Map(dateStr → weekIdx)
  const weekDates  = {};   // '#0142' → sorted date strings
  const weekBucket = {};   // '#0142' → {0:{baseline,promo,weather,festival}, ...}

  // Collect unique dates per store
  demandRows.forEach(r => {
    const sid  = (r['Store ID']||'').trim();
    const date = r['Week Start Date'];
    if(!sid || !date) return;
    if(!weekDates[sid]) weekDates[sid] = new Set();
    weekDates[sid].add(typeof date === 'object' ? date.toISOString().slice(0,10) : String(date).slice(0,10));
  });

  // Sort dates → week index map
  const weekIdx = {};
  Object.keys(weekDates).forEach(sid => {
    const sorted = Array.from(weekDates[sid]).sort();
    weekIdx[sid] = {};
    sorted.forEach((d,i) => weekIdx[sid][d] = i);
    weekBucket[sid] = {};
    sorted.forEach((_,i) => weekBucket[sid][i] = {baseline:0, promo:0, weather:0, festival:0});
  });

  // Aggregate
  demandRows.forEach(r => {
    const sid  = (r['Store ID']||'').trim();
    const date = r['Week Start Date'];
    if(!sid || !date) return;
    const dateStr = typeof date === 'object' ? date.toISOString().slice(0,10) : String(date).slice(0,10);
    const wi = weekIdx[sid] ? weekIdx[sid][dateStr] : undefined;
    if(wi === undefined) return;
    weekBucket[sid][wi].baseline  += Number(r['Baseline (units)']||0);
    weekBucket[sid][wi].promo     += Number(r['Promo Units']||0);
    weekBucket[sid][wi].weather   += Number(r['Weather Units']||0);
    weekBucket[sid][wi].festival  += Number(r['Festival Units']||0);
  });

  /* ── Build inventory: storeId → aggregated totals + skus */
  const invMap = {};
  invRows.forEach(r => {
    const sid = (r['Store ID']||'').trim();
    if(!sid) return;
    if(!invMap[sid]) invMap[sid] = {oh:0, it:0, ss:0, rop:0, rq:0, nr:0, skus:[]};
    const oh  = Number(r['On-Hand (units)']||0);
    const it  = Number(r['In-Transit (units)']||0);
    const ss  = Number(r['Safety Stock']||0);
    const rop = Number(r['ROP']||0);
    const rq  = Number(r['Replenishment Qty']||0);
    const nr  = Number(r['Net Requirement']||0);
    invMap[sid].oh  += oh;
    invMap[sid].it  += it;
    invMap[sid].ss  += ss;
    invMap[sid].rop += rop;
    invMap[sid].rq  += rq;
    invMap[sid].nr  += nr;
    // Find this SKU's weekly demand from demand sheet (week 0)
    const skuId = String(r['SKU ID']||'').trim();
    const skuName = String(r['SKU Name']||'').trim();
    let dmd = 0;
    demandRows.forEach(dr => {
      if((dr['Store ID']||'').trim()===sid && (dr['SKU ID']||'').trim()===skuId){
        const dd = dr['Week Start Date'];
        const ddStr = typeof dd==='object' ? dd.toISOString().slice(0,10) : String(dd).slice(0,10);
        if(weekIdx[sid] && weekIdx[sid][ddStr]===0) dmd = Number(dr['Baseline (units)']||0);
      }
    });
    // Derive status
    const st = dhDeriveStatus(oh, rop, nr, dmd);
    invMap[sid].skus.push({id:skuId, name:skuName, oh, it, dmd, ss, rop, nr, rq, st});
  });

  /* ── Build output per store */
  const result = {};
  Object.entries(DH_STORE_MASTER).forEach(([rawSid, master]) => {
    const jsKey  = master.id;
    const maxCap = master.maxCap;
    const wb0    = weekBucket[rawSid] || {};
    const numWeeks = Object.keys(wb0).length || 8;

    const forecastArr = [], sensedArr = [];
    for(let w=0; w<numWeeks; w++){
      const d = wb0[w] || {baseline:0, promo:0, weather:0, festival:0};
      forecastArr.push(d.baseline);
      sensedArr.push(d.baseline + d.promo + d.weather + d.festival);
    }

    // Signals from week 0
    const w0   = wb0[0] || {baseline:1, promo:0, weather:0, festival:0};
    const bl0  = w0.baseline || 1;
    const signals = [
      {t:'Promo',    pct:Math.round(w0.promo   /bl0*1000)/10, on:w0.promo   >0},
      {t:'Weather',  pct:Math.round(w0.weather /bl0*1000)/10, on:w0.weather >0},
      {t:'Festival', pct:Math.round(w0.festival/bl0*1000)/10, on:w0.festival>0},
      {t:'Trend',    pct:0, on:false},
      {t:'Event',    pct:0, on:false},
    ];
    const uplift = Math.round((w0.promo+w0.weather+w0.festival)/bl0*1000)/10;

    // Inventory totals
    const inv  = invMap[rawSid] || {oh:0, it:0, ss:0, rop:0, rq:0, nr:0, skus:[]};
    const oh   = inv.oh, it = inv.it, rop = inv.rop, rq = inv.rq;
    const ots  = Math.max(0, maxCap - oh - it);
    const cap  = Math.round(oh / maxCap * 100);

    // 8-week gap projection
    const gapArr = [];
    let running = oh + it;
    for(let w=0; w<numWeeks; w++){
      gapArr.push(Math.round(running - rop));
      running -= sensedArr[w];
      if(w===1) running += rq;
    }

    result[jsKey] = {
      onHand: oh, inTransit: it, ots, capPct: cap, uplift, signals,
      forecast: forecastArr, sensed: sensedArr, gap: gapArr, rop,
      kpisLive: {
        cu:  cap + '%',
        it:  String(it),
        itD: inv.skus.filter(s=>s.it>0).length + ' SKUs in transit',
      },
      skus: inv.skus,
      _meta: { weeks: numWeeks, skuCount: inv.skus.length }
    };
  });

  return result;
}

function dhDeriveStatus(oh, rop, nr, dmd){
  if(nr>0 && oh < rop*0.7) return 'low';
  if(nr>0) return 'replenish';
  if(dmd>0 && oh > dmd*6) return 'redeploy';
  if(oh >= rop) return 'ok';
  return 'hold';
}

function dhApplyToStores(liveStores){
  Object.keys(liveStores).forEach(function(storeId){
    if(!STORES[storeId]) return;
    const live = liveStores[storeId];
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
    if(live.kpisLive){
      STORES[storeId].kpis.cu  = live.kpisLive.cu;
      STORES[storeId].kpis.it  = live.kpisLive.it;
      STORES[storeId].kpis.itD = live.kpisLive.itD;
    }
    if(live.skus && live.skus.length) STORES[storeId].skus = live.skus;
  });
  // Re-render overview if visible
  if(document.getElementById('tab-overview').classList.contains('active')){
    selectStore(currentStore);
  }
  console.log('[Data Hub] STORES updated with live data from Excel');
}

const STATUS_COLOR = {
  replenish:{bg:'var(--red-light)',  color:'var(--red)'},
  low:      {bg:'var(--amber-light)',color:'var(--amber)'},
  ok:       {bg:'var(--green-light)',color:'var(--green)'},
  hold:     {bg:'var(--surface3)',   color:'var(--ink3)'},
  redeploy: {bg:'#EDE9FE',           color:'#6C5CE7'},
};

function dhRenderSummary(liveStores, fileName){
  // Summary cards
  const allSkus   = Object.values(liveStores).reduce((a,s)=>a+s._meta.skuCount,0);
  const weeks     = Object.values(liveStores)[0]?._meta.weeks || 8;
  const stores    = Object.keys(liveStores).length;
  const replenish = Object.values(liveStores).reduce((a,s)=>a+s.skus.filter(k=>k.st==='replenish'||k.st==='low').length,0);

  $id('dh-summary-cards').innerHTML = `
    <div class="dh-card"><div class="dh-card-val">${stores}</div><div class="dh-card-lbl">Stores loaded</div></div>
    <div class="dh-card"><div class="dh-card-val">${allSkus}</div><div class="dh-card-lbl">SKU records</div></div>
    <div class="dh-card"><div class="dh-card-val">${weeks}</div><div class="dh-card-lbl">Forecast weeks</div></div>
    <div class="dh-card"><div class="dh-card-val" style="color:var(--red)">${replenish}</div><div class="dh-card-lbl">SKUs needing replenishment</div></div>
  `;

  // Per-store table
  const tbody = $id('dh-store-tbody');
  tbody.innerHTML = '';
  const storeOrder = ['0142','0137','0151','0165','0188'];
  storeOrder.forEach(id => {
    const s = liveStores[id];
    if(!s) return;
    const activeSigs = s.signals.filter(sg=>sg.on);
    const chips = activeSigs.map(sg=>`<span class="dh-chip">${sg.t} +${sg.pct}%</span>`).join('') || '<span style="color:var(--ink5);font-size:11px">None</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${STORES[id]?STORES[id].name:id}</strong></td>
      <td>${s.onHand.toLocaleString()}</td>
      <td>${s.inTransit.toLocaleString()}</td>
      <td>${s.capPct}%</td>
      <td style="color:var(--blue);font-weight:600">+${s.uplift}%</td>
      <td><div class="dh-signal-chips">${chips}</div></td>
      <td>${s._meta.skuCount}</td>
      <td>${s._meta.weeks}</td>
    `;
    tbody.appendChild(tr);
  });

  $id('dh-timestamp').textContent = 'Last loaded: ' + new Date().toLocaleString() + ' · ' + fileName;
  $id('dh-summary').classList.add('visible');
}
/* ── end Data Hub ───────────────────────────────────────────── */
"""

# Inject JS right before the closing </script> tag
html = html.replace('</script>\n</body>', DH_JS + '\n</script>\n</body>', 1)
print('Step 5: Data Hub JS added')

# ══════════════════════════════════════════════════════════════════════════════
# 6. PATCH showScreen TO HANDLE 'datahub'
# ══════════════════════════════════════════════════════════════════════════════
html = html.replace(
    "if(name==='store') renderStoreDetail(currentStore);",
    "if(name==='store') renderStoreDetail(currentStore);\n  if(name==='datahub') {}  /* Data Hub has no init render needed */",
    1
)
print('Step 6: showScreen patched')

# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'Saved: {HTML_PATH}')
