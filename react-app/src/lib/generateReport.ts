import pptxgen from 'pptxgenjs'
import type { ReportData } from './reportData'

/* Builds a downloadable .pptx entirely client-side from already-computed
   real data (ReportData, from reportData.ts) -- no backend call, no LLM, so
   this works even without any LLM backend configured or running, and every number on
   every slide is something the app already computed elsewhere (status
   counts, net requirement, on-hand, the same redeploy-match definitions the
   AI Agent uses). Nothing here writes prose about what the numbers mean --
   it's tables and charts of real values, so there's nothing to fabricate. */

const INK = '1A1D23'
const INK3 = '5F6B7A'
const INK4 = '8B95A5'
const BORDER = 'E2E6EB'
const SURFACE2 = 'F1F3F6'
const BLUE = '2E6BE6'
const PURPLE = '6C5CE7'
const GREEN = '1A8754'
const AMBER = 'D97706'
const RED = 'C93B3B'
const GREY = '94A3B8'

const STATUS_COLOR: Record<string, string> = { ok: GREEN, low: AMBER, replenish: RED, hold: GREY, redeploy: BLUE }
const STATUS_LABEL: Record<string, string> = { ok: 'OK', low: 'Low', replenish: 'Replenish', hold: 'Hold', redeploy: 'Redeploy' }

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function generateReport(data: ReportData) {
  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 })
  pptx.layout = 'WIDE'

  const M = 0.55 // page margin

  // ── Slide 1: Title ──────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    s.background = { color: '1B2537' }
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 3.15, w: 13.33, h: 0.04, fill: { color: PURPLE } })
    s.addText('Demand & Replenishment', { x: M, y: 2.2, w: 12, h: 0.6, fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Arial' })
    s.addText('Network S&OP Summary', { x: M, y: 2.85, w: 12, h: 0.45, fontSize: 18, color: 'B0B8C4', fontFace: 'Arial' })
    s.addText(`Generated ${fmtDate(data.generatedAt)} · ${data.storeCount} stores · ${data.skuPositionCount} SKU positions`, {
      x: M, y: 6.6, w: 12, h: 0.35, fontSize: 11, color: '8B95A5', fontFace: 'Arial',
    })
    s.addText('Every figure in this deck comes directly from the loaded demand, inventory and sensing files — none is estimated.', {
      x: M, y: 6.95, w: 12, h: 0.3, fontSize: 9.5, italic: true, color: '6B7280', fontFace: 'Arial',
    })
  }

  // ── Slide 2: Network snapshot ───────────────────────────────────
  {
    const s = pptx.addSlide()
    addHeader(s, pptx, 'Network Snapshot', 'Inventory status across all loaded stores')

    const kpis: [string, string][] = [
      ['Stores loaded', String(data.storeCount)],
      ['SKU positions', String(data.skuPositionCount)],
      ['Flagged Replenish / Low', String(data.networkCounts.replenish + data.networkCounts.low)],
      ['Network sensed uplift', data.networkUpliftPct === null ? 'n/a' : `${data.networkUpliftPct >= 0 ? '+' : ''}${data.networkUpliftPct.toFixed(1)}%`],
    ]
    kpis.forEach(([label, value], i) => {
      const x = M + i * 3.05
      s.addShape(pptx.ShapeType.roundRect, { x, y: 1.55, w: 2.85, h: 1.15, rectRadius: 0.06, fill: { color: SURFACE2 }, line: { color: BORDER, width: 0.75 } })
      s.addText(value, { x: x + 0.18, y: 1.68, w: 2.5, h: 0.55, fontSize: 22, bold: true, color: INK, fontFace: 'Arial' })
      s.addText(label, { x: x + 0.18, y: 2.25, w: 2.5, h: 0.35, fontSize: 10.5, color: INK3, fontFace: 'Arial' })
    })

    const statusEntries = (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => ({
      name: STATUS_LABEL[k], value: data.networkCounts[k as keyof typeof data.networkCounts], color: STATUS_COLOR[k],
    }))
    s.addText('SKUs by status, network-wide', { x: M, y: 3.15, w: 8, h: 0.35, fontSize: 12, bold: true, color: INK, fontFace: 'Arial' })
    s.addChart(
      pptx.ChartType.bar,
      [{ name: 'SKUs', labels: statusEntries.map((e) => e.name), values: statusEntries.map((e) => e.value) }],
      {
        x: M, y: 3.55, w: 12.2, h: 3.3,
        barDir: 'col', chartColors: statusEntries.map((e) => e.color),
        showLegend: false, showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: INK,
        catAxisLabelColor: INK3, valAxisLabelColor: INK3, valAxisMinVal: 0,
        catAxisLineColor: BORDER, valAxisLineColor: BORDER,
      }
    )
  }

  // ── Slide 3: Per-store status table ─────────────────────────────
  {
    const s = pptx.addSlide()
    addHeader(s, pptx, 'Store-by-Store Inventory Status', 'Real SKU counts per status flag, per store')

    const header: pptxgen.TableRow = ['Store', 'Total SKUs', 'OK', 'Low', 'Replenish', 'Hold', 'Redeploy'].map((t) => cellHeader(t))
    const rows: pptxgen.TableRow[] = data.perStore.map((row) => [
      cell(row.storeName, { bold: true }),
      cell(String(row.totalSkus)),
      cell(String(row.counts.ok), { color: STATUS_COLOR.ok }),
      cell(String(row.counts.low), { color: STATUS_COLOR.low }),
      cell(String(row.counts.replenish), { color: STATUS_COLOR.replenish }),
      cell(String(row.counts.hold), { color: STATUS_COLOR.hold }),
      cell(String(row.counts.redeploy), { color: STATUS_COLOR.redeploy }),
    ])
    s.addTable([header, ...rows], {
      x: M, y: 1.6, w: 12.2, h: 4.8, fontSize: 12, fontFace: 'Arial', border: { type: 'solid', color: BORDER, pt: 0.75 },
      align: 'center', valign: 'middle', autoPage: false, colW: [3.2, 1.5, 1.5, 1.5, 1.7, 1.4, 1.4],
    })
  }

  // ── Slide 4: Critical SKUs ───────────────────────────────────────
  {
    const s = pptx.addSlide()
    addHeader(s, pptx, 'SKUs Needing Attention', 'Flagged Replenish or Low, real on-hand vs ROP')
    if (data.criticalSkus.length === 0) {
      addEmptyState(s, pptx, 'No SKUs are currently flagged Replenish or Low across the network.')
    } else {
      const header: pptxgen.TableRow = ['Store', 'SKU', 'On-hand', 'ROP', 'Net requirement', 'Status'].map((t) => cellHeader(t))
      const rows: pptxgen.TableRow[] = data.criticalSkus.slice(0, 14).map((r) => [
        cell(r.storeName), cell(r.skuName), cell(fmtNum(r.onHand)), cell(fmtNum(r.rop)), cell(fmtNum(r.netRequirement), { bold: true }),
        cell(STATUS_LABEL[r.status], { color: STATUS_COLOR[r.status], bold: true }),
      ])
      s.addTable([header, ...rows], {
        x: M, y: 1.6, w: 12.2, h: 4.9, fontSize: 11, fontFace: 'Arial', border: { type: 'solid', color: BORDER, pt: 0.75 },
        align: 'center', valign: 'middle', autoPage: false, colW: [2.6, 3.4, 1.6, 1.4, 2, 1.2],
      })
      if (data.criticalSkus.length > 14) {
        s.addText(`+ ${data.criticalSkus.length - 14} more not shown on this slide`, { x: M, y: 6.6, w: 8, h: 0.3, fontSize: 10, italic: true, color: INK4, fontFace: 'Arial' })
      }
    }
  }

  // ── Slide 5: Redeploy opportunities ─────────────────────────────
  {
    const s = pptx.addSlide()
    addHeader(s, pptx, 'Redeploy Opportunities', 'Same SKU overstocked at one store, short at another — real on-hand/ROP/net requirement only')
    if (data.redeployMatches.length === 0) {
      addEmptyState(s, pptx, 'No redeploy opportunities right now — no overstocked SKU currently matches a shortfall anywhere in the network.')
    } else {
      const header: pptxgen.TableRow = ['SKU', 'From (surplus)', 'To (shortfall)', 'Suggested transfer qty'].map((t) => cellHeader(t))
      const rows: pptxgen.TableRow[] = data.redeployMatches.slice(0, 14).map((m) => [
        cell(m.skuName), cell(`${m.sourceStore} (${fmtNum(m.sourceSurplus)})`), cell(`${m.targetStore} (${fmtNum(m.targetShortfall)})`),
        cell(fmtNum(m.suggestedQty), { bold: true, color: PURPLE }),
      ])
      s.addTable([header, ...rows], {
        x: M, y: 1.6, w: 12.2, h: 4.9, fontSize: 11.5, fontFace: 'Arial', border: { type: 'solid', color: BORDER, pt: 0.75 },
        align: 'center', valign: 'middle', autoPage: false, colW: [3.6, 3, 3, 2.6],
      })
    }
  }

  // ── Slide 6: Demand forecast vs sensed (network total) ──────────
  {
    const s = pptx.addSlide()
    const upliftNote = data.networkUpliftPct === null ? '' : ` · latest-month uplift ${data.networkUpliftPct >= 0 ? '+' : ''}${data.networkUpliftPct.toFixed(1)}%`
    addHeader(s, pptx, 'Demand Forecast vs AI-Sensed', `Network total, baseline vs sensed demand${upliftNote}`)
    if (data.demandTrend.labels.length === 0) {
      addEmptyState(s, pptx, 'No demand-file data loaded for any store.')
    } else {
      s.addChart(
        pptx.ChartType.line,
        [
          { name: 'Baseline forecast', labels: data.demandTrend.labels, values: data.demandTrend.baseline },
          { name: 'AI-sensed demand', labels: data.demandTrend.labels, values: data.demandTrend.sensed },
        ],
        {
          x: M, y: 1.6, w: 12.2, h: 5.2, chartColors: [GREY, PURPLE], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6,
          showLegend: true, legendPos: 't', legendColor: INK3, catAxisLabelColor: INK3, valAxisLabelColor: INK3,
          catAxisLineColor: BORDER, valAxisLineColor: BORDER,
        }
      )
    }
  }

  // ── Slide 7: Data coverage / what's not included ────────────────
  {
    const s = pptx.addSlide()
    addHeader(s, pptx, 'Data Coverage', 'What this report is (and isn\'t) built from')

    const header: pptxgen.TableRow = ['Store', 'Demand file', 'Inventory file', 'Sensing file'].map((t) => cellHeader(t))
    const rows: pptxgen.TableRow[] = data.coverage.map((c) => [
      cell(c.storeName, { bold: true }), coverageCell(c.hasDemand), coverageCell(c.hasInv), coverageCell(c.hasSensing),
    ])
    s.addTable([header, ...rows], {
      x: M, y: 1.6, w: 8, h: 3.2, fontSize: 12, fontFace: 'Arial', border: { type: 'solid', color: BORDER, pt: 0.75 },
      align: 'center', valign: 'middle', autoPage: false, colW: [3.2, 1.6, 1.6, 1.6],
    })

    s.addShape(pptx.ShapeType.roundRect, { x: M, y: 5.1, w: 12.2, h: 1.5, rectRadius: 0.06, fill: { color: 'FDE8E8' }, line: { color: 'F3C6C6', width: 0.75, dashType: 'dash' } })
    s.addText(
      'Not included in this deck: freight cost, truck capacity and DC → store lane data. Neither the demand nor the ' +
      'inventory file contains it, so transportation cost and lane-consolidation recommendations are not part of this report.',
      { x: M + 0.25, y: 5.3, w: 11.7, h: 1.1, fontSize: 11, color: '9B2C2C', fontFace: 'Arial', valign: 'middle' }
    )
  }

  // ── Slide 8: Closing ─────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    s.background = { color: '1B2537' }
    s.addText('Generated automatically', { x: M, y: 2.9, w: 12, h: 0.55, fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Arial' })
    s.addText(
      `Decision Intelligence Platform · ${fmtDate(data.generatedAt)}\nReal data only — no forecast, status or recommendation on any slide was written or estimated by hand.`,
      { x: M, y: 3.5, w: 11, h: 0.9, fontSize: 12.5, color: 'B0B8C4', fontFace: 'Arial', lineSpacing: 20 }
    )
  }

  return pptx.writeFile({ fileName: `Network-SOP-Summary-${data.generatedAt.toISOString().slice(0, 10)}.pptx` })
}

function addHeader(s: pptxgen.Slide, pptx: pptxgen, title: string, subtitle: string) {
  s.addText(title, { x: 0.55, y: 0.45, w: 12, h: 0.5, fontSize: 22, bold: true, color: INK, fontFace: 'Arial' })
  s.addText(subtitle, { x: 0.55, y: 0.95, w: 12, h: 0.4, fontSize: 12, color: INK3, fontFace: 'Arial' })
  s.addShape(pptx.ShapeType.line, { x: 0.55, y: 1.4, w: 12.2, h: 0, line: { color: BORDER, width: 1 } })
}

function addEmptyState(s: pptxgen.Slide, pptx: pptxgen, message: string) {
  s.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: 2.6, w: 12.2, h: 1.6, rectRadius: 0.08, fill: { color: SURFACE2 }, line: { color: BORDER, width: 0.75 } })
  s.addText(message, { x: 1.05, y: 2.6, w: 11.2, h: 1.6, fontSize: 14, color: INK3, fontFace: 'Arial', valign: 'middle', align: 'center' })
}

function cellHeader(text: string): pptxgen.TableCell {
  return { text, options: { bold: true, color: 'FFFFFF', fill: { color: '1B2537' }, fontSize: 11.5, fontFace: 'Arial' } }
}

function cell(text: string, opts: Partial<pptxgen.TableCellProps> = {}): pptxgen.TableCell {
  return { text, options: { color: INK, fontFace: 'Arial', ...opts } }
}

function coverageCell(has: boolean): pptxgen.TableCell {
  return { text: has ? 'Yes' : 'No data', options: { color: has ? GREEN : INK4, bold: has, fontFace: 'Arial' } }
}

function fmtNum(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}
