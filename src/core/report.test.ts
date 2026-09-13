import { describe, expect, it } from 'vitest'
import { renderReport, safeHref } from './report'
import { addBinding, addClaim, addReview, addSource, createWorkspace, reviseSource } from './workspace'

const clock = () => '2026-09-13T00:00:00.000Z'

describe('safeHref', () => {
  it('accepts http and https URLs', () => {
    expect(safeHref('https://example.org/x?y=1')).toBe('https://example.org/x?y=1')
    expect(safeHref('http://example.org')).toBe('http://example.org/')
  })
  it('rejects javascript:, data:, vbscript: and mixed-case/whitespace variants', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('  JaVaScRiPt:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<b>x</b>')).toBeNull()
    expect(safeHref('vbscript:x')).toBeNull()
    expect(safeHref('java\nscript:alert(1)')).toBeNull()
  })
  it('turns a bare DOI into an https doi.org link', () => {
    expect(safeHref('10.1000/abc.123', 'doi')).toBe('https://doi.org/10.1000/abc.123')
    expect(safeHref('javascript:alert(1)', 'doi')).toBeNull()
  })
})

describe('renderReport', () => {
  function ws() {
    let w = createWorkspace({ title: 'Report <b>T</b>', synthetic: true }, clock)
    const s = addSource(w, { title: 'Src "quoted"', text: 'Source says <script>alert(1)</script> here.', doi: '10.1000/xyz123', url: 'javascript:alert(2)' }, clock)
    w = s.ws
    const c = addClaim(w, { text: 'Claim with <img src=x onerror=alert(3)>', label: 'C1' }, clock)
    w = c.ws
    w = addBinding(w, { claimId: c.claimId, sourceId: s.sourceId, start: 12, end: 37 }, clock).ws
    w = addReview(w, { claimId: c.claimId, label: 'not-supported', rationale: 'Because </div><script>x()</script>' }, clock).ws
    w = reviseSource(w, { sourceId: s.sourceId, text: 'Source now says something else.' }, clock).ws
    return { w, c: c.claimId }
  }

  it('escapes every user-controlled string and contains no script element', () => {
    const html = renderReport(ws().w, { locale: 'en' })
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<img/i)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(3)&gt;')
    expect(html).toContain('Report &lt;b&gt;T&lt;/b&gt;')
  })

  it('never emits a dangerous href and renders unsafe URLs as plain text', () => {
    const html = renderReport(ws().w, { locale: 'en' })
    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).toContain('href="https://doi.org/10.1000/xyz123"')
  })

  it('marks synthetic workspaces, shows needs-re-review with the trigger, and omits full source text by default', () => {
    const html = renderReport(ws().w, { locale: 'en' })
    expect(html).toMatch(/Synthetic demo/)
    expect(html).toMatch(/Needs re-review/)
    expect(html).not.toContain('Source now says something else.')
  })

  it('can include full source text when explicitly requested', () => {
    const html = renderReport(ws().w, { locale: 'en', includeSourceText: true })
    expect(html).toContain('Source now says something else.')
  })

  it('renders Chinese labels when locale is zh-CN', () => {
    const html = renderReport(ws().w, { locale: 'zh-CN' })
    expect(html).toMatch(/合成演示/)
    expect(html).toMatch(/需复核/)
  })
})
