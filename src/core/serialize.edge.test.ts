import { describe, expect, it } from 'vitest'
import { exportWorkspace, importWorkspace } from './serialize'
import { addClaim, addSource, createWorkspace } from './workspace'

const clock = () => '2026-09-14T00:00:00.000Z'

function base() {
  let ws = createWorkspace({ title: 'E', synthetic: false }, clock)
  ws = addSource(ws, { title: 'S', text: 'alpha beta' }, clock).ws
  ws = addClaim(ws, { text: 'alpha' }, clock).ws
  return ws
}

describe('import edge cases found on the live alpha.2', () => {
  it('refuses an id whose number is not a safe integer, instead of corrupting the id counter', () => {
    const obj = JSON.parse(exportWorkspace(base()))
    obj.history.push({ id: 'ev_99999999999999999999', at: clock(), type: 'note', text: 'x' })
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/id/i)
  })

  it('refuses an oversized record id as well (otherwise-consistent workspace)', () => {
    const obj = JSON.parse(exportWorkspace(base()))
    const [k, v] = Object.entries(obj.claims)[0] as [string, Record<string, unknown>]
    const big = 'clm_99999999999999999999'
    delete obj.claims[k]
    obj.claims[big] = { ...v, id: big }
    for (const cv of Object.values(obj.claimVersions) as Record<string, unknown>[]) if (cv.claimId === k) cv.claimId = big
    for (const h of obj.history as Record<string, unknown>[]) if (h.claimId === k) h.claimId = big
    // Sanity: the same rename with a small number imports fine, so only the size is at issue.
    const small = JSON.parse(JSON.stringify(obj).split(big).join('clm_77'))
    small.nextId = 78
    expect(importWorkspace(JSON.stringify(small)).ok).toBe(true)
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/id/i)
  })

  it('refuses a non-integer nextId above the safe range', () => {
    const obj = JSON.parse(exportWorkspace(base()))
    obj.nextId = 2 ** 60
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
  })

  for (const type of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'no-such-type']) {
    it(`returns a validation error (does not throw) for history event type "${type}"`, () => {
      const obj = JSON.parse(exportWorkspace(base()))
      obj.history.push({ id: 'ev_900', at: clock(), type })
      let res: ReturnType<typeof importWorkspace> | undefined
      expect(() => {
        res = importWorkspace(JSON.stringify(obj))
      }).not.toThrow()
      expect(res!.ok).toBe(false)
      if (res!.ok) throw new Error()
      expect(res!.errors.join(' ')).toMatch(/history/i)
    })
  }

  it('names the allowed labels when a stored review label is not one of them', () => {
    const obj = JSON.parse(exportWorkspace(base()))
    const claimId = Object.keys(obj.claims)[0]
    const cvId = obj.claims[claimId].headVersionId
    obj.reviews.rev_800 = { id: 'rev_800', claimId, claimVersionId: cvId, label: 'unreviewed', rationale: 'r', basisSources: [], basisClaims: [], createdAt: clock() }
    obj.nextId = 801
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/label/i)
  })
})
