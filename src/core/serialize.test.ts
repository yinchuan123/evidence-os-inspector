import { describe, expect, it } from 'vitest'
import { exportWorkspace, importWorkspace } from './serialize'
import { addBinding, addClaim, addDependency, addReview, addSource, claimState, createWorkspace, reviseSource } from './workspace'

const clock = () => '2026-09-13T00:00:00.000Z'

function sample() {
  let ws = createWorkspace({ title: 'Sample', synthetic: true }, clock)
  const s = addSource(ws, { title: 'S', text: 'alpha beta gamma', doi: '10.1/x' }, clock); ws = s.ws
  const c1 = addClaim(ws, { text: 'alpha' }, clock); ws = c1.ws
  const c2 = addClaim(ws, { text: 'beta' }, clock); ws = c2.ws
  ws = addBinding(ws, { claimId: c1.claimId, sourceId: s.sourceId, start: 0, end: 5 }, clock).ws
  ws = addDependency(ws, { claimId: c2.claimId, dependsOnClaimId: c1.claimId, status: 'confirmed' }, clock).ws
  ws = addReview(ws, { claimId: c1.claimId, label: 'supported-in-scope', rationale: 'r' }, clock).ws
  ws = addReview(ws, { claimId: c2.claimId, label: 'partially-supported', rationale: 'r2' }, clock).ws
  ws = reviseSource(ws, { sourceId: s.sourceId, text: 'alpha beta gamma delta' }, clock).ws
  return { ws, c1: c1.claimId, c2: c2.claimId }
}

describe('export / import round trip', () => {
  it('produces JSON with the format identifier and version', () => {
    const json = exportWorkspace(sample().ws)
    const parsed = JSON.parse(json)
    expect(parsed.format).toBe('eosi-workspace')
    expect(parsed.formatVersion).toBe('0.1')
  })

  it('round-trips versions, bindings, dependencies, reviews and derived state', () => {
    const { ws, c1, c2 } = sample()
    const res = importWorkspace(exportWorkspace(ws))
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error(res.errors.join('; '))
    expect(res.ws).toEqual(ws)
    expect(claimState(res.ws, c1)).toEqual(claimState(ws, c1))
    expect(claimState(res.ws, c2).kind).toBe('needs-re-review')
    expect(exportWorkspace(res.ws)).toBe(exportWorkspace(ws))
  })
})

describe('import validation', () => {
  it('rejects non-JSON', () => {
    const res = importWorkspace('{not json')
    expect(res.ok).toBe(false)
  })

  it('rejects a different format identifier', () => {
    const res = importWorkspace(JSON.stringify({ format: 'something-else', formatVersion: '0.1' }))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors[0]).toMatch(/format/i)
  })

  it('rejects a newer format version it does not understand', () => {
    const res = importWorkspace(JSON.stringify({ format: 'eosi-workspace', formatVersion: '9.0' }))
    expect(res.ok).toBe(false)
  })

  it('rejects dangling references', () => {
    const { ws } = sample()
    const obj = JSON.parse(exportWorkspace(ws))
    obj.bindings['bnd_999'] = { ...(Object.values(obj.bindings)[0] as object), id: 'bnd_999', claimId: 'clm_missing' }
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/clm_missing/)
  })

  it('rejects a dependency cycle', () => {
    const { ws, c1, c2 } = sample()
    const obj = JSON.parse(exportWorkspace(ws))
    obj.dependencies['dep_999'] = { id: 'dep_999', claimId: c1, dependsOnClaimId: c2, status: 'confirmed', createdAt: clock() }
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/cycle/i)
  })

  it('rejects a content hash that does not match the stored text', () => {
    const { ws } = sample()
    const obj = JSON.parse(exportWorkspace(ws))
    const v = Object.values(obj.sourceVersions)[0] as { contentHash: string }
    v.contentHash = '0'.repeat(64)
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/hash/i)
  })

  it('rejects wrong field types instead of importing them', () => {
    const { ws } = sample()
    const obj = JSON.parse(exportWorkspace(ws))
    ;(Object.values(obj.claims)[0] as { headVersionId: unknown }).headVersionId = 42
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
  })

  it('drops unknown top-level keys rather than carrying executable-looking payloads', () => {
    const { ws } = sample()
    const obj = JSON.parse(exportWorkspace(ws))
    obj.__proto__ = { polluted: true }
    obj.extra = '<script>alert(1)</script>'
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error()
    expect((res.ws as unknown as Record<string, unknown>).extra).toBeUndefined()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
