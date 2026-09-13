import { describe, expect, it } from 'vitest'
import { renderReport } from './report'
import { exportWorkspace, importWorkspace } from './serialize'
import { addBinding, addClaim, addReview, addSource, claimDisplayLabel, createWorkspace, reviseSource } from './workspace'

const clock = () => '2026-09-14T00:00:00.000Z'

function unlabeled() {
  let ws = createWorkspace({ title: 'U', synthetic: false }, clock)
  const s = addSource(ws, { title: 'S', text: 'alpha beta gamma' }, clock); ws = s.ws
  const c1 = addClaim(ws, { text: 'first' }, clock); ws = c1.ws
  const c2 = addClaim(ws, { text: 'second' }, clock); ws = c2.ws
  ws = addBinding(ws, { claimId: c1.claimId, sourceId: s.sourceId, start: 0, end: 5 }, clock).ws
  ws = addReview(ws, { claimId: c1.claimId, label: 'supported-in-scope', rationale: 'r' }, clock).ws
  ws = reviseSource(ws, { sourceId: s.sourceId, text: 'alpha beta delta' }, clock).ws
  return { ws, c1: c1.claimId, c2: c2.claimId }
}

// Found by the regression sweep on the live alpha.2 (2026-09-14).
describe('display labels for claims without a label', () => {
  it('claimDisplayLabel uses the 1-based position when no label is set', () => {
    const { ws, c1, c2 } = unlabeled()
    expect(claimDisplayLabel(ws, c1)).toBe('1')
    expect(claimDisplayLabel(ws, c2)).toBe('2')
  })

  it('the HTML report never shows internal claim ids', () => {
    const html = renderReport(unlabeled().ws, { locale: 'en', now: clock() })
    expect(html).not.toMatch(/clm_\d+/)
    expect(html).toMatch(/<strong>1<\/strong>/)
  })
})

describe('report column headers', () => {
  it('uses "Generated" only for the report itself, not for version or history times', () => {
    const html = renderReport(unlabeled().ws, { locale: 'en', now: clock() })
    // "Generated" still appears in the report's own meta line and footer, which is correct.
    expect(html).not.toMatch(/<th>Generated<\/th>/)
    expect(html).toMatch(/<th>Created \(UTC\)<\/th>/)
    expect(html).toMatch(/<th>Time \(UTC\)<\/th>/)
    const zh = renderReport(unlabeled().ws, { locale: 'zh-CN', now: clock() })
    expect(zh).not.toMatch(/<th>生成时间<\/th>/)
    expect(zh).toMatch(/<th>创建时间 \(UTC\)<\/th>/)
  })
})

describe('import references are resolved as own records only', () => {
  function withDependency(dependsOn: string) {
    const obj = JSON.parse(exportWorkspace(unlabeled().ws))
    const claimId = Object.keys(obj.claims)[0]
    obj.dependencies.dep_700 = { id: 'dep_700', claimId, dependsOnClaimId: dependsOn, status: 'confirmed', createdAt: clock() }
    obj.nextId = 701
    return obj
  }
  for (const name of ['constructor', '__proto__', 'toString', 'valueOf']) {
    it(`refuses a dependency on a claim named "${name}" without throwing`, () => {
      let res: ReturnType<typeof importWorkspace> | undefined
      expect(() => {
        res = importWorkspace(JSON.stringify(withDependency(name)))
      }).not.toThrow()
      expect(res!.ok).toBe(false)
    })
  }

  it('refuses a binding whose source version id is an inherited name', () => {
    const obj = JSON.parse(exportWorkspace(unlabeled().ws))
    const b = Object.values(obj.bindings)[0] as Record<string, unknown>
    b.sourceVersionId = 'hasOwnProperty'
    let res: ReturnType<typeof importWorkspace> | undefined
    expect(() => {
      res = importWorkspace(JSON.stringify(obj))
    }).not.toThrow()
    expect(res!.ok).toBe(false)
  })

  it('refuses duplicate history event ids', () => {
    const obj = JSON.parse(exportWorkspace(unlabeled().ws))
    obj.history.push({ ...obj.history[0] })
    const res = importWorkspace(JSON.stringify(obj))
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error()
    expect(res.errors.join(' ')).toMatch(/duplicate/i)
  })
})
