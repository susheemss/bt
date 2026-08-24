/* Normalises a "Week Start Date" cell to a YYYY-MM-DD key regardless of how
   Excel happened to format that cell. Ported from the HTML build's
   dhDateStr(), including the two bugs that were found and fixed there:

   1. A Date-formatted cell always means some midnight, but SheetJS may hand
      it back as local midnight OR as UTC midnight nudged by the timezone
      offset. Reading raw UTC getters in a UTC+ timezone (e.g. IST) silently
      moves every date to the previous day. Rounding to the nearest local
      midnight recovers the intended calendar day either way.
   2. A General-formatted cell holding the same value comes back as the raw
      Excel serial number (days since 1899-12-30) instead of a Date object.
   3. A manually-typed text date is parsed with an explicit regex, never via
      `new Date(string)`, whose behaviour is timezone-dependent and would
      shift the calendar day.

   Mixed formatting within one file (some rows Date, some General) would
   otherwise make the same calendar month produce two different grouping
   keys and silently fragment/misalign the data -- this makes all three
   representations collapse to the same key. */
export function dateKey(v: unknown): string {
  if (v instanceof Date) {
    const d = new Date(v.getTime())
    if (d.getHours() >= 12) d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  if (typeof v === 'number' && isFinite(v)) {
    const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30)
    return new Date(EXCEL_EPOCH_UTC + Math.round(v) * 86400000).toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) // YYYY-MM-DD / YYYY/MM/DD
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/) // M/D/YYYY
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return s
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2025-11-01' -> 'Nov 2025', for tooltips and labels that want the real month. */
export function monthLabel(key: string): string {
  const m = key.match(/^(\d{4})-(\d{2})/)
  if (!m) return key
  const mi = parseInt(m[2], 10) - 1
  return `${MONTH_NAMES[mi] ?? m[2]} ${m[1]}`
}
