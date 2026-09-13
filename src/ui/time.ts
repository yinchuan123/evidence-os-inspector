/**
 * Format an ISO timestamp in the viewer's local time zone as
 * YYYY-MM-DD HH:mm:ss UTC+hh:mm. Stored timestamps stay in UTC (ISO 8601 with Z);
 * only the display is local, and the offset makes it unambiguous.
 */
export function formatLocalTime(iso: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  const off = -t.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const zone = `UTC${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())} ${zone}`
}
