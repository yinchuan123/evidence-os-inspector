import { describe, expect, it } from 'vitest'
import { renderReport } from './report'
import { exportWorkspace, importWorkspace, MAX_ID_NUMBER } from './serialize'
import { addBinding, addClaim, addReview, addSource, claimsInOrder, createWorkspace, reviseSource } from './workspace'

const clock = () => '2026-09-14T00:00:00.000Z'

function base() {
  let ws = createWorkspace({ title: 'A4', synthetic: false }, clock)
  const s = addSource(ws, { title: 'S', text: 'alpha beta gamma' }, clock); ws = s.ws
  const c = addClaim(ws, { text: 'first' }, clock); ws = c.ws
  ws = addBinding(ws, { claimId: c.claimId, sourceId: s.sourceId, start: 0, end: 5 }, clock).ws
  ws = addReview(ws, { claimId: c.claimId, label: 'supported-in-scope', rationale: 'r' }, clock).ws
  return { ws, sourceId: s.sourceId, claimId: c.claimId }
}

// Found by the final review of the live alpha.3 (2026-09-14).
describe('id headroom after import', () => {
  it('a workspace imported with an id at the limit stays importable after further edits', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    obj.history.push({ id: `ev_${MAX_ID_NUMBER}`, at: clock(), type: 'note', text: 'at the limit' })
    const first = importWorkspace(JSON.stringify(obj))
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error(first.errors.join('; '))
    const edited = addClaim(first.ws, { text: 'after import' }, clock).ws
    const again = importWorkspace(exportWorkspace(edited))
    expect(again.ok).toBe(true)
  })

  it('still refuses ids above the limit', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    obj.history.push({ id: `ev_${MAX_ID_NUMBER + 1}`, at: clock(), type: 'note', text: 'over' })
    expect(importWorkspace(JSON.stringify(obj)).ok).toBe(false)
  })

  it('ids referenced only from a review basis also raise nextId, so they cannot be reused', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    const r = Object.values(obj.reviews)[0] as { basisSources: { bindingId: string }[] }
    r.basisSources[0].bindingId = 'bnd_9000'
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error()
    expect(res.ws.nextId).toBeGreaterThan(9000)
  })
})

describe('review basis must belong to the reviewed claim', () => {
  it('refuses a basis binding that is bound to another claim', () => {
    let { ws, sourceId } = base()
    const other = addClaim(ws, { text: 'other' }, clock); ws = other.ws
    const ob = addBinding(ws, { claimId: other.claimId, sourceId, start: 6, end: 10 }, clock); ws = ob.ws
    const obj = JSON.parse(exportWorkspace(ws))
    const r = Object.values(obj.reviews)[0] as { basisSources: { bindingId: string }[] }
    r.basisSources[0].bindingId = ob.bindingId
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/basis/i)
  })

  it('refuses a basis whose source version differs from the binding it names', () => {
    let { ws, sourceId } = base()
    ws = reviseSource(ws, { sourceId, text: 'alpha beta delta' }, clock).ws
    const obj = JSON.parse(exportWorkspace(ws))
    const r = Object.values(obj.reviews)[0] as { basisSources: { sourceVersionId: string }[] }
    r.basisSources[0].sourceVersionId = obj.sources[sourceId].headVersionId
    expect(importWorkspace(JSON.stringify(obj)).ok).toBe(false)
  })
})

describe('claim order', () => {
  it('a new claim goes after the last one even when imported order values have gaps', () => {
    let ws = base().ws
    ws = addClaim(ws, { text: 'second' }, clock).ws
    const obj = JSON.parse(exportWorkspace(ws))
    const ids = Object.keys(obj.claims)
    obj.claims[ids[0]].order = 5
    obj.claims[ids[1]].order = 9
    const res = importWorkspace(JSON.stringify(obj))
    if (!res.ok) throw new Error(res.errors.join('; '))
    const next = addClaim(res.ws, { text: 'third' }, clock)
    expect(claimsInOrder(next.ws).map((c) => c.id).at(-1)).toBe(next.claimId)
  })
})

describe('report', () => {
  function revisedAndRebound() {
    let { ws, sourceId, claimId } = base()
    ws = reviseSource(ws, { sourceId, text: 'omega beta delta' }, clock).ws
    ws = addBinding(ws, { claimId, sourceId, start: 0, end: 5 }, clock).ws
    return ws
  }
  it('shows the passage an earlier review was based on, not only the current one', () => {
    const html = renderReport(revisedAndRebound(), { locale: 'en', now: clock() })
    expect(html).toContain('omega')
    expect(html).toMatch(/Earlier passages/)
    expect(html).toContain('<blockquote class="old">alpha</blockquote>')
  })
  it('calls the starred review "latest" in Chinese, not "currently valid"', () => {
    const html = renderReport(revisedAndRebound(), { locale: 'zh-CN', now: clock() })
    expect(html).not.toContain('当前有效审阅')
    expect(html).toContain('最新审阅')
  })
  it('wraps tables so they scroll on a phone, and labels report times as UTC', () => {
    const html = renderReport(revisedAndRebound(), { locale: 'en', now: clock() })
    expect(html.match(/<table>/g)!.length).toBe(html.match(/<div class="table-wrap"><table>/g)!.length)
    expect(html).toMatch(/<th>Time \(UTC\)<\/th>/)
  })
})

describe('compact renumbering of oversized ids', () => {
  it('keeps order, references and derived state when ids are renumbered', async () => {
    const { claimState, reviewsOf, claimsInOrder: order } = await import('./workspace')
    let { ws, sourceId, claimId } = base()
    ws = reviseSource(ws, { sourceId, text: 'alpha beta delta' }, clock).ws
    const before = claimState(ws, claimId)
    // Shift every id number up by 2^40 in the exported JSON (ids stay well-formed and consistent).
    const json = exportWorkspace(ws).replace(/"([a-z]+)_(\d+)"/g, (_m, p: string, n: string) => `"${p}_${Number(n) + 2 ** 40}"`)
    const obj = JSON.parse(json)
    obj.nextId = obj.nextId + 2 ** 40
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error(res.errors.join('; '))
    expect(res.ws.nextId).toBeLessThan(100)
    const c = order(res.ws)[0]
    expect(claimState(res.ws, c.id).kind).toBe(before.kind)
    expect(reviewsOf(res.ws, c.id)).toHaveLength(1)
    expect(res.ws.history.map((h) => h.type)).toEqual(ws.history.map((h) => h.type))
    expect(importWorkspace(exportWorkspace(addClaim(res.ws, { text: 'more' }, clock).ws)).ok).toBe(true)
  })
})
