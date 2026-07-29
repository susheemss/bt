# AI-Enabled Demand Sensing & Replenishment Cockpit
## Project Brief for Claude Code

> This file is the single source of truth for the project. Read it fully before writing any code.
> Generated from the UX & wireframe design session — v0.2 · 17 Jun 2026.

---

## 1. What this product is

A **supply chain planning web application** for a 5-store retail network. The system uses AI to:
- Forecast demand at store × SKU level
- Run demand sensing (detect real-time demand shifts from promo, weather, festival, trend signals)
- Calculate how much inventory each store needs
- Auto-generate replenishment orders to the DC (distribution centre)
- Consolidate DC→store delivery lanes to minimise transportation cost

**The single business objective: reduce network transportation cost while holding a 98% service level.**

---

## 2. Reference files in this project

| File | What it is |
|------|-----------|
| `replenishment-cockpit-prototype.html` | Standalone HTML prototype — the visual and UX reference. Open in browser. All three screens are in here. |
| `Demand-Sensing-Replenishment-Wireframe-v0.2.pptx` | Annotated lo-fi wireframe with redline notes — the spec document. 5 slides. |

---

## 3. Network scope

| Entity | Detail |
|--------|--------|
| Stores | 5 stores — #0142 Indiranagar, #0137 Koramangala, #0151 HSR Layout, #0165 Whitefield, #0188 Jayanagar |
| SKUs | 100+ SKUs per store |
| Distribution centre | 1 DC (single source of replenishment) |
| Planning horizon | 8 weeks rolling |
| Replenishment cycle | Weekly |
| Lead time | 2 days (DC to store) |
| Currency | Indian Rupees (₹), quantities in Lakhs where appropriate |

---

## 4. Domain logic — read this carefully

### 4.1 Demand forecast
- Baseline forecast at **store × SKU** level, multi-week horizon
- Stored per store, updated each cycle
- When user selects a store, every panel on the dashboard filters to that store's data

### 4.2 Demand sensing
- Runs on top of the baseline forecast
- Input signals: **Promo, Weather, Festival, Trend, Local events**
- Output: a sensed demand figure that adjusts the baseline up or down
- Example: Store #0142 showed +6.4% uplift from Promo + Festival signals
- The gap between sensed demand and baseline is surfaced as a chart overlay
- **This is always AI-driven** — label it "AI technology" in the UI wherever the sensing output is shown

### 4.3 Inventory gap / net requirement formula
```
Net requirement = (Sensed demand over lead time + Safety stock) − On-hand − In-transit
```
- If net requirement ≤ 0 → status: **OK** or **Hold** (already well-stocked)
- If net requirement > 0 → status: **Replenish** or **Low** (needs stock)
- If on-hand is significantly above sensed demand → status: **Redeploy** (move excess to a short store)
- Net requirement is always **clamped to store capacity** — never recommend more than the store can physically hold

### 4.4 Capacity
- Each store has a **max capacity** (e.g., 14,000 units for Store #0142)
- **Open-to-ship headroom** = Max capacity − On-hand − In-transit
- Replenishment quantity can never exceed open-to-ship headroom
- Capacity utilization % = On-hand / Max capacity

### 4.5 POS sell-through
- Live source of on-hand and actual offtake data
- Feeds into the inventory gap calculation
- Displayed as the "On-hand inventory — DRP" chart

### 4.6 AI replenishment optimiser
- Takes net requirements from all 5 stores
- Consolidates orders onto shared DC→store lanes
- Objective: maximise truck fill (target 85%+) to avoid LTL premium
- Mode selection: FTL (full truckload), FTL consolidated (two stores on one truck), Milk-run (multi-stop small load)
- Output: a consolidated replenishment plan with freight cost per lane
- **Auto-releases a DRP (Distribution Requirements Planning) order to the DC** when approved

### 4.7 Status flags (SKU level)

| Flag | Meaning | Colour |
|------|---------|--------|
| Replenish | Net req > 0, order needed | Red |
| Low | Stock approaching ROP (reorder point), urgent | Amber |
| OK | Sufficient stock | Green |
| Hold | Overstock vs sensed demand, do not order | Grey |
| Redeploy | Excess here, shortage elsewhere — move it | Blue |

---

## 5. Three screens

### Screen 1 — Network demand & inventory cockpit
**Route:** `/` or `/overview`

**Purpose:** Store-level at-a-glance. The store selector (dropdown, top right) drives every panel.

**KPI tiles (top row):**
1. Service level (%)
2. Fill rate (%) with wow delta
3. Capacity utilisation (%) vs ceiling
4. In-transit units + open loads count
5. Transportation cost MTD — **highlighted, this is the primary metric the system optimises**

**Chart panels (4 across):**
1. Demand forecast — baseline: bar chart, units/week, W1–W8
2. Demand sensing vs baseline: dual line chart (solid = sensed, dashed = baseline), sensed uplift % badge
3. On-hand inventory — DRP: bar chart, projected draw-down + replenishment, highlight bars where stock hits reorder point
4. Inventory gap / net requirement: line chart, zero line = baseline, below zero = shortfall (shown in red)

**AI recommendation strip (full width, below charts):**
- Label: "AI technology" with star icon
- Shows 2–3 bullet recommendations (what to order, lane to consolidate, SKUs to redeploy)
- Right side: estimated freight saving per cycle + "Release DRP order to DC" CTA button

---

### Screen 2 — Store SKU replenishment detail
**Route:** `/stores/:storeId`

**Purpose:** Drill-down per store. SKU-by-SKU net requirement and replenishment quantity.

**Left panel — store summary:**
- Store name, format, lead time
- Capacity utilisation progress bar (fill to %)
- Stats: On-hand, In-transit, Open-to-ship headroom, Target service level
- Active demand signals as chips (Promo, Weather, Festival, Trend, Event)
- AI note: "AI technology detects +X% demand uplift vs baseline this horizon"

**Right — SKU table:**

| Column | Description |
|--------|-------------|
| SKU | SKU identifier |
| On-hand | Current physical stock |
| In-transit | Stock already dispatched from DC, not yet received |
| Sensed dmd/wk | AI-sensed weekly demand |
| Safety stock | Minimum buffer to hold at all times |
| ROP | Reorder point (safety stock + demand over lead time) |
| Net req. | Calculated net requirement (see formula above) |
| Replen qty | Recommended order quantity (may differ from net req. due to MOQ or pack sizes) |
| Status | Flag (Replenish / Low / OK / Hold / Redeploy) |

**AI footer bar:** "X SKUs flagged for replenishment · consolidated lane DC → #{storeId} · truck fill Y%" + "Auto-release to DC" button

---

### Screen 3 — AI replenishment & DC dispatch
**Route:** `/replenishment`

**Purpose:** Network-level view. The AI-optimised plan for the full cycle.

**KPI tiles (4 across):**
1. Transportation cost for the week — **highlighted**
2. Average truck utilisation % with delta vs unoptimised
3. LTL / expedite loads count with delta
4. Capacity-feasible % (should always be 100%)

**Consolidated replenishment plan table:**

| Column | Description |
|--------|-------------|
| Lane (DC → store) | DC to store route identifier |
| SKUs | Number of SKUs on this load |
| Units | Total units in this load |
| Truck fill | % of truck capacity used |
| Mode | FTL / FTL (consol.) / Milk-run |
| Freight | Cost for this lane |
| vs baseline | % saving vs un-optimised (always show in green with ↓) |
| (total row) | Network totals |

**Right — AI rationale panel (dashed border, "AI technology" tag):**

Three Q&A blocks answering:
1. "How does the system maximise capacity vs the demand forecast?"
2. "What is the ideal inventory for each store?"
3. "How is transportation cost reduced?"

**Top bar CTA:** "Approve all lanes" button (triggers DRP release to DC for all stores)

---

## 6. Navigation / sidebar

```
Sidebar (dark navy #1B2537)
├── PLANNING
│   ├── Network overview         → Screen 1
│   ├── Stores                   → Screen 2  [badge: shortfall count]
│   └── Replenishment            → Screen 3  [AI dot: purple]
│
├── INTELLIGENCE
│   ├── Demand sensing           [AI dot]
│   ├── Forecast accuracy
│   └── POS sell-through
│
└── CONFIGURATION
    ├── Store settings
    └── Users & roles

Footer: logged-in user avatar + name + role
```

---

## 7. Design tokens

Use these exact values. They are already in the HTML prototype as CSS variables.

```css
--bg: #F7F8FA;
--surface: #FFFFFF;
--surface2: #F1F3F6;
--surface3: #E8ECF1;
--border: #E2E6EB;
--border2: #D0D5DC;
--ink: #1A1D23;
--ink2: #3B4150;
--ink3: #5F6B7A;
--ink4: #8B95A5;
--ink5: #B0B8C4;
--blue: #2E6BE6;
--blue-light: #EBF1FD;
--blue-dark: #1D4FA0;
--green: #1A8754;
--green-light: #E6F5ED;
--amber: #D97706;
--amber-light: #FEF3E2;
--red: #C93B3B;
--red-light: #FDE8E8;
--purple: #6C5CE7;           /* AI technology colour */
--purple-light: #F0EEFE;
--sidebar: #1B2537;
--sidebar-hover: #253245;
--radius: 6px;
--radius-lg: 10px;
```

**Typography:** Inter (Google Fonts). No other font.

**AI technology visual convention:**
- All AI-driven outputs use the `--purple` colour
- AI badge format: small pill, purple bg/text, star icon, text "AI technology" or "AI-Powered sensing" or "AI-optimized"
- AI panels use a dashed purple border
- The purple gradient line at the top of the AI recommendation strip: `linear-gradient(90deg, var(--purple), var(--blue), var(--purple))`

---

## 8. Supply chain terminology rules

**Always use these terms. Never substitute with a generic word.**

| Use this | Not this |
|----------|----------|
| SKU | product / item |
| On-hand | current stock / inventory on shelf |
| In-transit | incoming / on the way |
| Safety stock | buffer stock / minimum |
| ROP | reorder level |
| Net requirement | how much to order |
| DRP order | replenishment order |
| DC | warehouse / distribution hub |
| Fill rate | order fulfilment rate |
| Service level | availability % |
| Demand sensing | live demand adjustment |
| Demand forecast | projected demand |
| Sell-through | POS data / sales data |
| Truck fill | truck capacity utilisation |
| FTL | full truckload |
| LTL | less-than-truckload |
| Milk-run | multi-drop small-load route |
| Lane | DC → store route |
| Capacity utilisation | how full the store is |

---

## 9. Suggested tech stack

The HTML prototype is vanilla HTML/CSS/JS. For the real build, consider:

```
Frontend:   React + TypeScript
Styling:    Tailwind CSS (map the design tokens above to your tailwind.config)
Charts:     Recharts or Nivo
State:      Zustand or React Query
Routing:    React Router v6

Backend:    Node.js (Express) or Python (FastAPI)
DB:         PostgreSQL (store × SKU × week demand table)
AI layer:   Anthropic Claude API (demand sensing signals → natural language recommendations)
Auth:       Clerk or Auth0
```

---

## 10. Suggested file structure

```
/
├── CLAUDE.md                          ← this file
├── replenishment-cockpit-prototype.html  ← visual reference
├── Demand-Sensing-Replenishment-Wireframe-v0.2.pptx ← spec
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── kpi/
│   │   │   └── KpiTile.tsx
│   │   ├── charts/
│   │   │   ├── DemandForecastChart.tsx
│   │   │   ├── DemandSensingChart.tsx
│   │   │   ├── OnHandDRPChart.tsx
│   │   │   └── InventoryGapChart.tsx
│   │   ├── ai/
│   │   │   ├── AIRecommendationStrip.tsx  ← Screen 1 bottom strip
│   │   │   ├── AIRationalePanel.tsx       ← Screen 3 right panel
│   │   │   └── AITag.tsx                  ← reusable purple badge
│   │   ├── tables/
│   │   │   ├── SkuTable.tsx
│   │   │   └── ReplenishmentPlanTable.tsx
│   │   └── store/
│   │       └── StoreSummaryCard.tsx
│   │
│   ├── pages/
│   │   ├── Overview.tsx          ← Screen 1
│   │   ├── StoreDetail.tsx       ← Screen 2
│   │   └── Dispatch.tsx          ← Screen 3
│   │
│   ├── hooks/
│   │   ├── useStoreData.ts
│   │   ├── useDemandForecast.ts
│   │   ├── useDemandSensing.ts
│   │   └── useReplenishmentPlan.ts
│   │
│   ├── api/
│   │   ├── stores.ts
│   │   ├── forecast.ts
│   │   ├── sensing.ts
│   │   ├── inventory.ts
│   │   └── replenishment.ts
│   │
│   ├── types/
│   │   └── index.ts              ← all TypeScript interfaces
│   │
│   └── utils/
│       └── supplyChain.ts        ← net requirement formula, status flag logic
```

---

## 11. TypeScript types to define first

```typescript
// types/index.ts

export type StoreId = '0142' | '0137' | '0151' | '0165' | '0188';

export interface Store {
  id: StoreId;
  name: string;
  location: string;
  format: 'S' | 'M' | 'L';
  leadTimeDays: number;
  maxCapacity: number;
  targetServiceLevel: number; // 0–1
}

export interface SkuInventory {
  skuId: string;
  storeId: StoreId;
  onHand: number;
  inTransit: number;
  safetyStock: number;
  rop: number; // reorder point
  baselineDemandPerWeek: number;
  sensedDemandPerWeek: number;   // AI-adjusted
  netRequirement: number;        // computed
  replenQty: number;             // recommended order qty
  status: 'replenish' | 'low' | 'ok' | 'hold' | 'redeploy';
}

export interface DemandSignal {
  type: 'promo' | 'weather' | 'festival' | 'trend' | 'event';
  upliftPct: number; // e.g. 0.064 = +6.4%
  active: boolean;
}

export interface ReplenishmentLane {
  storeId: StoreId;
  skuCount: number;
  totalUnits: number;
  truckFillPct: number;
  mode: 'FTL' | 'FTL_CONSOL' | 'MILK_RUN';
  freightCost: number;
  vsBaselinePct: number; // negative = saving
  approved: boolean;
}

export interface NetworkKpis {
  serviceLevel: number;
  fillRate: number;
  capacityUtil: number;
  inTransitUnits: number;
  transportationCostMTD: number;
  transportationCostVsPlan: number; // negative = under plan (good)
}
```

---

## 12. Net requirement utility function

```typescript
// utils/supplyChain.ts

export function computeNetRequirement(params: {
  sensedDemandPerWeek: number;
  leadTimeDays: number;
  safetyStock: number;
  onHand: number;
  inTransit: number;
  openToShipHeadroom: number;
}): number {
  const demandOverLeadTime = params.sensedDemandPerWeek * (params.leadTimeDays / 7);
  const required = demandOverLeadTime + params.safetyStock;
  const available = params.onHand + params.inTransit;
  const raw = required - available;
  // Clamp to capacity headroom
  return Math.min(Math.max(raw, 0), params.openToShipHeadroom);
}

export function computeStatus(params: {
  netRequirement: number;
  onHand: number;
  sensedDemandPerWeek: number;
  rop: number;
}): SkuInventory['status'] {
  if (params.netRequirement > 0 && params.onHand < params.rop * 0.7) return 'low';
  if (params.netRequirement > 0) return 'replenish';
  if (params.onHand > params.sensedDemandPerWeek * 6) return 'redeploy'; // 6 weeks of stock = redeploy
  if (params.onHand > params.rop) return 'ok';
  return 'hold';
}
```

---

## 13. AI integration points

These are the specific places where the Anthropic Claude API (or equivalent) should be called:

| Feature | What AI does | Where it shows |
|---------|-------------|----------------|
| Demand sensing | Reads POS trends + external signals, outputs % uplift per store per SKU | Demand sensing chart overlay, signal chips |
| Recommendation text | Generates 2–3 bullet recommendations (what to order, which lanes to consolidate, what to redeploy) | AI strip on Screen 1 |
| Freight saving estimate | Estimates ₹ saving from consolidation vs unoptimised baseline | AI CTA box on Screen 1 |
| Lane optimisation | Assigns SKUs to lanes, selects FTL/Milk-run mode, computes truck fill | Screen 3 replenishment plan table |
| Rationale Q&A | Generates plain-English answers to "why" questions | Screen 3 right panel |

---

## 14. Common mistakes to avoid

- **Never** recommend a replenishment quantity that exceeds `openToShipHeadroom`
- **Never** call a store's stock "inventory" in the UI — it's always "on-hand"
- **Never** use generic words like "order", "product", "available stock" — see terminology table in §8
- The transportation cost KPI tile is always **highlighted** (blue tint) because it's the primary objective metric
- The store selector on Screen 1 must update **all four charts and all KPI tiles** simultaneously
- Status flags must match exactly: `replenish` (red), `low` (amber), `ok` (green), `hold` (grey), `redeploy` (blue)
- AI badges always use `--purple` (`#6C5CE7`), never blue or green
- The "vs baseline" column in the dispatch table is always shown in green with a ↓ arrow (it's always a saving)

---

## 15. Quick-start prompts for Claude Code

Once you have this file in your project root, try these:

```
"Build the Sidebar component matching the design in CLAUDE.md section 6"

"Create the SkuTable component using the column spec in section 5, Screen 2"

"Implement the computeNetRequirement utility from section 12"

"Build the AI recommendation strip from Screen 1 — use purple for all AI elements"

"Create the TypeScript types from section 11"

"Build Screen 3 (Dispatch) layout with the two-column grid: plan table on left, rationale panel on right"
```

---

*End of project brief. Last updated: 17 Jun 2026.*
