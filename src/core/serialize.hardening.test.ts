import { describe, expect, it } from 'vitest'
import { exportWorkspace, importWorkspace } from './serialize'
import { addClaim, addReview, addSource, createWorkspace } from './workspace'

const clock = () => '2026-09-13T00:00:00.000Z'

function base() {
  let ws = createWorkspace({ title: 'H', synthetic: false }, clock)
  const s = addSource(ws, { title: 'S', text: 'alpha beta' }, clock); ws = s.ws
  const c = addClaim(ws, { text: 'alpha' }, clock); ws = c.ws
  ws = addReview(ws, { claimId: c.claimId, label: 'cannot-determine', rationale: 'r' }, clock).ws
  return { ws, claimId: c.claimId }
}

describe('import hardening', () => {
  it('rejects a history event whose id does not match the id pattern', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    obj.history.push({ id: 'evil', at: clock(), type: 'note', text: 'x' })
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/history/i)
  })

  it('keeps only the fields defined for each history event type', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    obj.history.push({ id: 'ev_900', at: clock(), type: 'note', text: 'ok', smuggled: 'payload', sourceId: 'src_1' })
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error(res.errors.join('; '))
    const ev = res.ws.history.find((h) => h.id === 'ev_900') as Record<string, unknown>
    expect(ev).toEqual({ id: 'ev_900', at: clock(), type: 'note', text: 'ok' })
  })

  it('rejects a history event missing a required field for its type', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    obj.history.push({ id: 'ev_901', at: clock(), type: 'source-revised', sourceId: 'src_1' })
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
  })

  it('rejects a stored review whose label is "unreviewed"', () => {
    const { ws } = base()
    const obj = JSON.parse(exportWorkspace(ws))
    const r = Object.values(obj.reviews)[0] as { label: string }
    r.label = 'unreviewed'
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
  })

  it('nextId stays a finite integer above every id after import', () => {
    const obj = JSON.parse(exportWorkspace(base().ws))
    obj.history.push({ id: 'ev_5000', at: clock(), type: 'note', text: 'x' })
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error()
    expect(Number.isInteger(res.ws.nextId)).toBe(true)
    expect(res.ws.nextId).toBeGreaterThan(5000)
  })
})

describe('addReview', () => {
  it('refuses the placeholder label "unreviewed"', () => {
    const { ws, claimId } = base()
    expect(() => addReview(ws, { claimId, label: 'unreviewed', rationale: 'r' }, clock)).toThrow(/label/i)
  })
})
