import { describe, expect, it } from 'vitest'
import { DEMOS, buildDemo, type DemoId } from './index'
import { allClaimStates, claimsInOrder, computeImpact, reviewsOf, reviseSource } from '../core/workspace'

const clock = () => '2026-09-13T00:00:00.000Z'

describe('synthetic demos', () => {
  it('lists three demos, all flagged synthetic', () => {
    expect(DEMOS.map((d) => d.id)).toEqual(['correction-impact', 'scope-check', 'missing-then-supplemented'])
    for (const d of DEMOS) expect(buildDemo(d.id, clock).ws.meta.synthetic).toBe(true)
  })

  it('demo 1 starts with five reviewed claims and three sources', () => {
    const { ws } = buildDemo('correction-impact', clock)
    expect(Object.keys(ws.sources)).toHaveLength(3)
    const states = allClaimStates(ws)
    expect(claimsInOrder(ws).map((c) => states.get(c.id)!.kind)).toEqual(['current', 'current', 'current', 'current', 'current'])
  })

  it('demo 1: applying the suggested correction to source A flags exactly C1 (direct) and C4 (indirect)', () => {
    const demo = buildDemo('correction-impact', clock)
    const step = demo.suggestedCorrection!
    const rev = reviseSource(demo.ws, { sourceId: step.sourceId, text: step.text }, clock)
    expect(rev.changed).toBe(true)
    const impact = computeImpact(rev.ws, { sourceId: step.sourceId, fromVersionId: demo.ws.sources[step.sourceId].headVersionId, toVersionId: rev.versionId })
    const label = (id: string) => rev.ws.claims[id].label
    expect(impact.direct.map(label)).toEqual(['C1'])
    expect(impact.indirect.map((x) => label(x.claimId))).toEqual(['C4'])
    expect(impact.potential).toEqual([])
    expect(impact.unaffected.map(label).sort()).toEqual(['C2', 'C3', 'C5'])
    const states = allClaimStates(rev.ws)
    const byLabel = Object.fromEntries(claimsInOrder(rev.ws).map((c) => [c.label, states.get(c.id)!.kind]))
    expect(byLabel).toEqual({ C1: 'needs-re-review', C2: 'current', C3: 'current', C4: 'needs-re-review', C5: 'current' })
  })

  it('demo 2 records a human scope judgement with a bound passage', () => {
    const { ws } = buildDemo('scope-check', clock)
    const claims = claimsInOrder(ws)
    const flagged = claims.filter((c) => {
      const r = reviewsOf(ws, c.id).at(-1)
      return r && (r.label === 'not-supported' || r.label === 'partially-supported')
    })
    expect(flagged.length).toBeGreaterThanOrEqual(1)
    for (const c of flagged) {
      const r = reviewsOf(ws, c.id).at(-1)!
      expect(r.rationale.length).toBeGreaterThan(20)
      expect(r.basisSources.length).toBeGreaterThan(0)
    }
  })

  it('demo 3 keeps the earlier "cannot determine" verdict in history and ends current', () => {
    const { ws } = buildDemo('missing-then-supplemented', clock)
    const claim = claimsInOrder(ws).find((c) => reviewsOf(ws, c.id).length >= 2)!
    const labels = reviewsOf(ws, claim.id).map((r) => r.label)
    expect(labels[0]).toBe('cannot-determine')
    expect(labels.at(-1)).not.toBe('cannot-determine')
    expect(allClaimStates(ws).get(claim.id)!.kind).toBe('current')
  })

  it('every demo id builds deterministically with a fixed clock', () => {
    for (const d of DEMOS) {
      const a = JSON.stringify(buildDemo(d.id as DemoId, clock).ws)
      const b = JSON.stringify(buildDemo(d.id as DemoId, clock).ws)
      expect(a).toBe(b)
    }
  })
})
