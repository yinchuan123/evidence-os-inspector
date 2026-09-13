import { describe, expect, it } from 'vitest'
import {
  addBinding,
  addClaim,
  addDependency,
  addReview,
  addSource,
  claimState,
  computeImpact,
  createWorkspace,
  editClaim,
  latestReview,
  renameSource,
  reviseSource,
  type Clock,
} from './workspace'
import { sha256Hex } from './hash'

const fixedClock: Clock = () => '2026-09-13T00:00:00.000Z'

function fresh() {
  return createWorkspace({ title: 'T', synthetic: false }, fixedClock)
}

describe('createWorkspace', () => {
  it('starts empty with the format identifier and a creation event', () => {
    const ws = fresh()
    expect(ws.format).toBe('eosi-workspace')
    expect(ws.formatVersion).toBe('0.1')
    expect(Object.keys(ws.sources)).toHaveLength(0)
    expect(ws.history.map((h) => h.type)).toEqual(['workspace-created'])
  })
})

describe('sources', () => {
  it('addSource records version 1 with a content hash and unverified identifier status', () => {
    const r = addSource(fresh(), { title: 'A', text: 'hello world', doi: '10.0000/x' }, fixedClock)
    const src = r.ws.sources[r.sourceId]
    const v = r.ws.sourceVersions[src.headVersionId]
    expect(v.versionNo).toBe(1)
    expect(v.text).toBe('hello world')
    expect(v.contentHash).toBe(sha256Hex('hello world'))
    expect(src.identifierStatus).toBe('user-provided-unverified')
  })

  it('addSource without identifiers has identifierStatus none', () => {
    const r = addSource(fresh(), { title: 'A', text: 'x' }, fixedClock)
    expect(r.ws.sources[r.sourceId].identifierStatus).toBe('none')
  })

  it('reviseSource keeps the old version immutable and moves head to version 2', () => {
    const a = addSource(fresh(), { title: 'A', text: 'v1 text' }, fixedClock)
    const b = reviseSource(a.ws, { sourceId: a.sourceId, text: 'v2 text' }, fixedClock)
    const src = b.ws.sources[a.sourceId]
    expect(b.versionId).not.toBe(a.versionId)
    expect(src.headVersionId).toBe(b.versionId)
    expect(b.ws.sourceVersions[a.versionId].text).toBe('v1 text')
    expect(b.ws.sourceVersions[b.versionId].versionNo).toBe(2)
    expect(b.ws.history.at(-1)).toMatchObject({ type: 'source-revised', fromVersionId: a.versionId, toVersionId: b.versionId })
  })

  it('reviseSource with identical text does not create a version', () => {
    const a = addSource(fresh(), { title: 'A', text: 'same' }, fixedClock)
    const b = reviseSource(a.ws, { sourceId: a.sourceId, text: 'same' }, fixedClock)
    expect(b.versionId).toBe(a.versionId)
    expect(Object.keys(b.ws.sourceVersions)).toHaveLength(1)
  })

  it('renameSource changes the title without creating a version', () => {
    const a = addSource(fresh(), { title: 'A', text: 't' }, fixedClock)
    const b = renameSource(a.ws, { sourceId: a.sourceId, title: 'A renamed' }, fixedClock)
    expect(b.sources[a.sourceId].title).toBe('A renamed')
    expect(b.sources[a.sourceId].headVersionId).toBe(a.versionId)
    expect(Object.keys(b.sourceVersions)).toHaveLength(1)
  })
})

describe('claims and bindings', () => {
  it('addClaim creates version 1 and the claim starts unreviewed', () => {
    const r = addClaim(fresh(), { text: 'Claim one.' }, fixedClock)
    expect(r.ws.claimVersions[r.versionId].versionNo).toBe(1)
    expect(claimState(r.ws, r.claimId)).toEqual({ kind: 'unreviewed' })
  })

  it('addBinding records offsets, excerpt and the head source version', () => {
    let ws = fresh()
    const s = addSource(ws, { title: 'S', text: 'The quick brown fox.' }, fixedClock)
    ws = s.ws
    const c = addClaim(ws, { text: 'Fox is quick.' }, fixedClock)
    ws = c.ws
    const b = addBinding(ws, { claimId: c.claimId, sourceId: s.sourceId, start: 4, end: 9 }, fixedClock)
    const binding = b.ws.bindings[b.bindingId]
    expect(binding.excerpt).toBe('quick')
    expect(binding.sourceVersionId).toBe(s.versionId)
  })

  it('addBinding rejects offsets outside the source text', () => {
    let ws = fresh()
    const s = addSource(ws, { title: 'S', text: 'short' }, fixedClock)
    ws = s.ws
    const c = addClaim(ws, { text: 'c' }, fixedClock)
    ws = c.ws
    expect(() => addBinding(ws, { claimId: c.claimId, sourceId: s.sourceId, start: 2, end: 99 }, fixedClock)).toThrow(/range/i)
    expect(() => addBinding(ws, { claimId: c.claimId, sourceId: s.sourceId, start: 3, end: 3 }, fixedClock)).toThrow(/empty/i)
  })

  it('addBinding rejects dangling claim or source ids', () => {
    let ws = fresh()
    const s = addSource(ws, { title: 'S', text: 'text' }, fixedClock)
    ws = s.ws
    expect(() => addBinding(ws, { claimId: 'nope', sourceId: s.sourceId, start: 0, end: 1 }, fixedClock)).toThrow(/claim/i)
  })
})

describe('reviews and staleness', () => {
  function reviewedPair() {
    let ws = fresh()
    const s = addSource(ws, { title: 'A', text: 'Alpha reports X in adults.' }, fixedClock)
    ws = s.ws
    const c = addClaim(ws, { text: 'X occurs in adults.' }, fixedClock)
    ws = c.ws
    const b = addBinding(ws, { claimId: c.claimId, sourceId: s.sourceId, start: 0, end: 26 }, fixedClock)
    ws = b.ws
    const r = addReview(ws, { claimId: c.claimId, label: 'supported-in-scope', rationale: 'ok' }, fixedClock)
    ws = r.ws
    return { ws, s, c, b, r }
  }

  it('addReview snapshots the source versions it was based on and makes the claim current', () => {
    const { ws, s, c, r } = reviewedPair()
    const review = ws.reviews[r.reviewId]
    expect(review.basisSources).toEqual([{ sourceId: s.sourceId, sourceVersionId: s.versionId, bindingId: expect.any(String) }])
    expect(claimState(ws, c.claimId)).toEqual({ kind: 'current', reviewId: r.reviewId, label: 'supported-in-scope' })
  })

  it('revising a bound source makes the claim need re-review with the source as trigger', () => {
    const { ws, s, c } = reviewedPair()
    const rev = reviseSource(ws, { sourceId: s.sourceId, text: 'Alpha reports X in children.' }, fixedClock)
    const state = claimState(rev.ws, c.claimId)
    expect(state.kind).toBe('needs-re-review')
    if (state.kind !== 'needs-re-review') throw new Error()
    expect(state.reasons).toEqual([
      { type: 'source-changed', sourceId: s.sourceId, reviewedVersionId: s.versionId, currentVersionId: rev.versionId },
    ])
  })

  it('editing claim text invalidates the old review', () => {
    const { ws, c } = reviewedPair()
    const e = editClaim(ws, { claimId: c.claimId, text: 'X always occurs in everyone.' }, fixedClock)
    const state = claimState(e.ws, c.claimId)
    expect(state.kind).toBe('needs-re-review')
    if (state.kind !== 'needs-re-review') throw new Error()
    expect(state.reasons[0]).toMatchObject({ type: 'claim-edited', currentVersionId: e.versionId })
    // old review is retained
    expect(Object.keys(e.ws.reviews)).toHaveLength(1)
  })

  it('editing claim text to the same value is a no-op', () => {
    const { ws, c } = reviewedPair()
    const e = editClaim(ws, { claimId: c.claimId, text: 'X occurs in adults.' }, fixedClock)
    expect(e.versionId).toBe(c.versionId)
    expect(claimState(e.ws, c.claimId).kind).toBe('current')
  })

  it('re-reviewing binds to the new versions and keeps the old review in history', () => {
    const { ws, s, c, r } = reviewedPair()
    const rev = reviseSource(ws, { sourceId: s.sourceId, text: 'Alpha reports X in children.' }, fixedClock)
    let ws2 = rev.ws
    const b2 = addBinding(ws2, { claimId: c.claimId, sourceId: s.sourceId, start: 0, end: 28 }, fixedClock)
    ws2 = b2.ws
    const r2 = addReview(ws2, { claimId: c.claimId, label: 'not-supported', rationale: 'population changed' }, fixedClock)
    const state = claimState(r2.ws, c.claimId)
    expect(state).toEqual({ kind: 'current', reviewId: r2.reviewId, label: 'not-supported' })
    expect(latestReview(r2.ws, c.claimId)?.id).toBe(r2.reviewId)
    expect(r2.ws.reviews[r.reviewId]).toBeDefined()
    expect(r2.ws.reviews[r2.reviewId].basisSources.map((x) => x.sourceVersionId)).toContain(rev.versionId)
  })

  it('a binding added after the review flags the claim for re-review', () => {
    const { ws, c } = reviewedPair()
    const s2 = addSource(ws, { title: 'B', text: 'Beta says otherwise.' }, fixedClock)
    const b = addBinding(s2.ws, { claimId: c.claimId, sourceId: s2.sourceId, start: 0, end: 4 }, fixedClock)
    const state = claimState(b.ws, c.claimId)
    expect(state.kind).toBe('needs-re-review')
    if (state.kind !== 'needs-re-review') throw new Error()
    expect(state.reasons[0]).toMatchObject({ type: 'binding-added-after-review', bindingId: b.bindingId })
  })
})

describe('dependencies', () => {
  function twoClaims() {
    let ws = fresh()
    const c1 = addClaim(ws, { text: 'one' }, fixedClock)
    ws = c1.ws
    const c2 = addClaim(ws, { text: 'two' }, fixedClock)
    ws = c2.ws
    return { ws, c1: c1.claimId, c2: c2.claimId }
  }

  it('rejects a self-dependency', () => {
    const { ws, c1 } = twoClaims()
    expect(() => addDependency(ws, { claimId: c1, dependsOnClaimId: c1, status: 'confirmed' }, fixedClock)).toThrow(/itself/i)
  })

  it('rejects a dangling reference', () => {
    const { ws, c1 } = twoClaims()
    expect(() => addDependency(ws, { claimId: c1, dependsOnClaimId: 'ghost', status: 'confirmed' }, fixedClock)).toThrow(/unknown claim/i)
  })

  it('rejects a cycle, including through a longer path', () => {
    const { ws, c1, c2 } = twoClaims()
    const c3 = addClaim(ws, { text: 'three' }, fixedClock)
    let w = c3.ws
    w = addDependency(w, { claimId: c2, dependsOnClaimId: c1, status: 'confirmed' }, fixedClock).ws
    w = addDependency(w, { claimId: c3.claimId, dependsOnClaimId: c2, status: 'confirmed' }, fixedClock).ws
    expect(() => addDependency(w, { claimId: c1, dependsOnClaimId: c3.claimId, status: 'confirmed' }, fixedClock)).toThrow(/cycle/i)
  })

  it('rejects a duplicate edge instead of silently overwriting it', () => {
    const { ws, c1, c2 } = twoClaims()
    const w = addDependency(ws, { claimId: c2, dependsOnClaimId: c1, status: 'unconfirmed' }, fixedClock).ws
    expect(() => addDependency(w, { claimId: c2, dependsOnClaimId: c1, status: 'confirmed' }, fixedClock)).toThrow(/already exists/i)
  })
})

describe('impact propagation (synthetic example 1 topology)', () => {
  // Source A -> C1 -> C4 ; Source B -> C2 ; Source C -> C3 ; C2, C3 -> C5
  function build(c5EdgeStatus: 'confirmed' | 'unconfirmed' = 'confirmed') {
    let ws = fresh()
    const A = addSource(ws, { title: 'A', text: 'Source A text.' }, fixedClock); ws = A.ws
    const B = addSource(ws, { title: 'B', text: 'Source B text.' }, fixedClock); ws = B.ws
    const C = addSource(ws, { title: 'C', text: 'Source C text.' }, fixedClock); ws = C.ws
    const ids: Record<string, string> = {}
    for (const name of ['C1', 'C2', 'C3', 'C4', 'C5']) {
      const c = addClaim(ws, { text: `${name} statement.`, label: name }, fixedClock)
      ws = c.ws
      ids[name] = c.claimId
    }
    ws = addBinding(ws, { claimId: ids.C1, sourceId: A.sourceId, start: 0, end: 6 }, fixedClock).ws
    ws = addBinding(ws, { claimId: ids.C2, sourceId: B.sourceId, start: 0, end: 6 }, fixedClock).ws
    ws = addBinding(ws, { claimId: ids.C3, sourceId: C.sourceId, start: 0, end: 6 }, fixedClock).ws
    ws = addDependency(ws, { claimId: ids.C4, dependsOnClaimId: ids.C1, status: 'confirmed' }, fixedClock).ws
    ws = addDependency(ws, { claimId: ids.C5, dependsOnClaimId: ids.C2, status: 'confirmed' }, fixedClock).ws
    ws = addDependency(ws, { claimId: ids.C5, dependsOnClaimId: ids.C3, status: c5EdgeStatus }, fixedClock).ws
    for (const name of ['C1', 'C2', 'C3', 'C4', 'C5']) {
      ws = addReview(ws, { claimId: ids[name], label: 'supported-in-scope', rationale: 'r' }, fixedClock).ws
    }
    return { ws, ids, A, B, C }
  }

  it('revising A affects C1 directly and C4 indirectly; C2, C3, C5 unaffected', () => {
    const { ws, ids, A } = build()
    const rev = reviseSource(ws, { sourceId: A.sourceId, text: 'Source A corrected text.' }, fixedClock)
    const impact = computeImpact(rev.ws, { sourceId: A.sourceId, fromVersionId: A.versionId, toVersionId: rev.versionId })
    expect(impact.direct).toEqual([ids.C1])
    expect(impact.indirect).toEqual([{ claimId: ids.C4, path: [ids.C1, ids.C4] }])
    expect(impact.potential).toEqual([])
    expect(new Set(impact.unaffected)).toEqual(new Set([ids.C2, ids.C3, ids.C5]))
  })

  it('derived states match the impact report after revising A', () => {
    const { ws, ids, A } = build()
    const rev = reviseSource(ws, { sourceId: A.sourceId, text: 'Source A corrected text.' }, fixedClock)
    const st = (n: string) => claimState(rev.ws, ids[n])
    expect(st('C1').kind).toBe('needs-re-review')
    const c4 = st('C4')
    expect(c4.kind).toBe('needs-re-review')
    if (c4.kind !== 'needs-re-review') throw new Error()
    expect(c4.reasons).toEqual([{ type: 'upstream-needs-re-review', dependsOnClaimId: ids.C1, path: [ids.C1, ids.C4] }])
    expect(st('C2').kind).toBe('current')
    expect(st('C3').kind).toBe('current')
    expect(st('C5').kind).toBe('current')
  })

  it('an unconfirmed edge yields only potential impact and does not change derived state', () => {
    const { ws, ids, C } = build('unconfirmed')
    const rev = reviseSource(ws, { sourceId: C.sourceId, text: 'Source C corrected.' }, fixedClock)
    const impact = computeImpact(rev.ws, { sourceId: C.sourceId, fromVersionId: C.versionId, toVersionId: rev.versionId })
    expect(impact.direct).toEqual([ids.C3])
    expect(impact.indirect).toEqual([])
    expect(impact.potential).toHaveLength(1)
    expect(impact.potential[0]).toMatchObject({ claimId: ids.C5, path: [ids.C3, ids.C5] })
    expect(claimState(rev.ws, ids.C5).kind).toBe('current')
  })

  it('after C1 is re-reviewed, C4 still needs re-review because its upstream verdict was re-issued', () => {
    const { ws, ids, A } = build()
    const rev = reviseSource(ws, { sourceId: A.sourceId, text: 'Source A corrected text.' }, fixedClock)
    let w = rev.ws
    w = addBinding(w, { claimId: ids.C1, sourceId: A.sourceId, start: 0, end: 6 }, fixedClock).ws
    const r = addReview(w, { claimId: ids.C1, label: 'partially-supported', rationale: 'changed' }, fixedClock)
    w = r.ws
    expect(claimState(w, ids.C1).kind).toBe('current')
    const c4 = claimState(w, ids.C4)
    expect(c4.kind).toBe('needs-re-review')
    if (c4.kind !== 'needs-re-review') throw new Error()
    expect(c4.reasons[0]).toMatchObject({ type: 'upstream-re-reviewed', dependsOnClaimId: ids.C1, currentReviewId: r.reviewId })
    // and re-reviewing C4 clears it
    const r4 = addReview(w, { claimId: ids.C4, label: 'supported-in-scope', rationale: 'checked' }, fixedClock)
    expect(claimState(r4.ws, ids.C4).kind).toBe('current')
  })
})
