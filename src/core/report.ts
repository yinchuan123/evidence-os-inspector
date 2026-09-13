import { t, type Locale } from './i18n'
import type { ID, StaleReason, Workspace } from './types'
import {
  activeBindingsOf,
  claimDisplayLabel,
  supersededBindingsOf,
  allClaimStates,
  claimsInOrder,
  dependenciesOf,
  latestReview,
  reviewsOf,
  sourceVersionsOf,
} from './workspace'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Control characters and whitespace are stripped before protocol checks so
// that "java\nscript:" style tricks cannot slip through.
// oxlint-disable-next-line no-control-regex -- stripping control characters is the point
const STRIP_RE = /[\x00-\x1f\x7f\s]/g
const DOI_RE = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/

/**
 * Return an href that is safe to emit, or null. Only absolute http(s) URLs are
 * allowed. DOIs are turned into https://doi.org links after validation.
 */
export function safeHref(raw: string, kind: 'url' | 'doi' = 'url'): string | null {
  const cleaned = raw.replace(STRIP_RE, '')
  if (kind === 'doi') {
    if (!DOI_RE.test(cleaned)) return null
    return `https://doi.org/${cleaned}`
  }
  let u: URL
  try {
    u = new URL(cleaned)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  return u.href
}

export interface ReportOptions {
  locale: Locale
  includeSourceText?: boolean
  now?: string
}

const CSS = `
:root{color-scheme:light}
body{margin:0 auto;padding:24px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1c1c1c;background:#fff;max-width:960px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:14px;margin:16px 0 4px}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;border:1px solid #999;margin-left:6px;vertical-align:middle}
.badge.synthetic{background:#fff4d6;border-color:#c99400;color:#5a4300}
.state{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600}
.state.unreviewed{background:#eee;color:#444}.state.current{background:#dff3e3;color:#155724}.state.needs-re-review{background:#ffe1e1;color:#7a1414}
.claim{border:1px solid #ddd;border-radius:6px;padding:12px 14px;margin:10px 0}
.claim p.text{font-size:15px;margin:4px 0 8px}
blockquote{margin:6px 0;padding:6px 10px;border-left:3px solid #aaa;background:#f7f7f7;white-space:pre-wrap}
.meta{color:#555;font-size:12px}
ul{margin:4px 0;padding-left:20px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all}
.table-wrap{overflow-x:auto;max-width:100%}table{border-collapse:collapse;width:100%}td{overflow-wrap:anywhere}blockquote.old{border-left-color:#ccc;color:#555}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top;font-size:13px}
.notice{border:1px solid #c99400;background:#fff4d6;padding:8px 12px;border-radius:6px;margin:8px 0}
footer{margin-top:32px;color:#666;font-size:12px;border-top:1px solid #ddd;padding-top:8px}
`

export function renderReport(ws: Workspace, opts: ReportOptions): string {
  const d = t(opts.locale)
  const e = escapeHtml
  const states = allClaimStates(ws)
  const claimLabel = (id: ID) => claimDisplayLabel(ws, id)
  const claimText = (id: ID) => ws.claimVersions[ws.claims[id].headVersionId].text
  const sourceLabel = (id: ID) => ws.sources[id]?.title ?? id
  const verNo = (svId: ID) => ws.sourceVersions[svId]?.versionNo ?? '?'
  const cverNo = (cvId: ID) => ws.claimVersions[cvId]?.versionNo ?? '?'
  const arrow = ' → '

  const reasonHtml = (r: StaleReason): string => {
    switch (r.type) {
      case 'claim-edited':
        return `${e(d.reason[r.type])} (v${cverNo(r.reviewedVersionId)}${arrow}v${cverNo(r.currentVersionId)})`
      case 'source-changed':
        return `${e(d.reason[r.type])}: ${e(sourceLabel(r.sourceId))} (v${verNo(r.reviewedVersionId)}${arrow}v${verNo(r.currentVersionId)})`
      case 'binding-added-after-review':
        return e(d.reason[r.type])
      case 'dependency-added-after-review':
        return `${e(d.reason[r.type])}: ${e(claimLabel(r.dependsOnClaimId))}`
      case 'upstream-needs-re-review':
        return `${e(d.reason[r.type])}: ${e(claimLabel(r.dependsOnClaimId))}. ${e(d.path)}: ${r.path.map((p) => e(claimLabel(p))).join(arrow)}`
      case 'upstream-re-reviewed':
        return `${e(d.reason[r.type])}: ${e(claimLabel(r.dependsOnClaimId))}`
    }
  }

  const parts: string[] = []
  parts.push(`<h1>${e(d.report)}: ${e(ws.meta.title)}${ws.meta.synthetic ? `<span class="badge synthetic">${e(d.syntheticBadge)}</span>` : ''}</h1>`)
  parts.push(`<div class="meta">${e(d.appName)} - ${e(d.generatedAt)} ${e(opts.now ?? new Date().toISOString())}</div>`)
  if (ws.meta.synthetic) parts.push(`<div class="notice">${e(d.syntheticNotice)}</div>`)
  if (ws.meta.description) parts.push(`<p>${e(ws.meta.description)}</p>`)

  // Claims
  const claims = claimsInOrder(ws)
  parts.push(`<h2>${e(d.claims)} (${claims.length})</h2>`)
  for (const c of claims) {
    const st = states.get(c.id)!
    parts.push(`<div class="claim">`)
    parts.push(
      `<div><strong>${e(claimLabel(c.id))}</strong> <span class="meta">v${cverNo(c.headVersionId)}</span> <span class="state ${st.kind}">${e(d.state[st.kind])}</span>${
        st.kind !== 'unreviewed' ? ` <span class="badge">${e(d.label[st.label])}</span>` : ''
      }</div>`,
    )
    parts.push(`<p class="text">${e(claimText(c.id))}</p>`)
    if (st.kind === 'needs-re-review') {
      parts.push(`<div><strong>${e(d.trigger)}</strong><ul>${st.reasons.map((r) => `<li>${reasonHtml(r)}</li>`).join('')}</ul></div>`)
    }
    const bindings = activeBindingsOf(ws, c.id)
    if (bindings.length === 0) parts.push(`<div class="meta">${e(d.noBindings)}</div>`)
    for (const b of bindings) {
      parts.push(`<div class="meta">${e(d.excerpt)}: ${e(sourceLabel(b.sourceId))} v${verNo(b.sourceVersionId)}, ${e(d.position)} ${b.start}-${b.end}</div>`)
      parts.push(`<blockquote>${e(b.excerpt)}</blockquote>`)
    }
    const older = supersededBindingsOf(ws, c.id)
    if (older.length) {
      parts.push(`<div class="meta"><strong>${e(d.earlierPassages)}</strong></div>`)
      for (const b of older) {
        parts.push(`<div class="meta">${e(sourceLabel(b.sourceId))} v${verNo(b.sourceVersionId)}, ${e(d.position)} ${b.start}-${b.end}</div>`)
        parts.push(`<blockquote class="old">${e(b.excerpt)}</blockquote>`)
      }
    }
    const deps = dependenciesOf(ws, c.id)
    if (deps.length) {
      parts.push(
        `<div class="meta">${e(d.dependsOn)}: ${deps
          .map((x) => `${e(claimLabel(x.dependsOnClaimId))} (${e(x.status === 'confirmed' ? d.confirmed : d.unconfirmed)})`)
          .join(', ')}</div>`,
      )
    }
    const reviews = reviewsOf(ws, c.id)
    if (reviews.length) {
      const latestId = latestReview(ws, c.id)?.id
      parts.push(
        `<h3>${e(d.reviews)}</h3><div class="table-wrap"><table><tr><th>#</th><th>${e(d.claim)} ${e(d.version)}</th><th>${e(d.review)}</th><th>${e(d.rationale)}</th><th>${e(d.basedOn)}</th><th>${e(d.reviewer)}</th></tr>`,
      )
      reviews.forEach((r, i) => {
        const basis = [
          ...r.basisSources.map((b) => `${e(sourceLabel(b.sourceId))} v${verNo(b.sourceVersionId)}`),
          ...r.basisClaims.map((b) => `${e(claimLabel(b.claimId))} v${cverNo(b.claimVersionId)}`),
        ].join('; ')
        parts.push(
          `<tr><td>${i + 1}${r.id === latestId ? ' *' : ''}</td><td>v${cverNo(r.claimVersionId)}</td><td>${e(d.label[r.label])}</td><td>${e(r.rationale)}</td><td>${basis || '-'}</td><td>${e(r.reviewer ?? '-')}</td></tr>`,
        )
      })
      parts.push(`</table></div><div class="meta">* = ${e(d.latestReview)}</div>`)
    }
    parts.push(`</div>`)
  }

  // Sources
  const sources = Object.values(ws.sources)
  parts.push(`<h2>${e(d.sources)} (${sources.length})</h2>`)
  for (const s of sources) {
    const versions = sourceVersionsOf(ws, s.id)
    const head = ws.sourceVersions[s.headVersionId]
    parts.push(`<div class="claim"><div><strong>${e(s.title)}</strong> <span class="meta">v${head.versionNo}</span></div>`)
    const idBits: string[] = []
    if (s.doi) {
      const href = safeHref(s.doi, 'doi')
      idBits.push(href ? `DOI: <a href="${e(href)}" rel="noopener noreferrer">${e(s.doi)}</a>` : `DOI: ${e(s.doi)}`)
    }
    if (s.url) {
      const href = safeHref(s.url)
      idBits.push(href ? `URL: <a href="${e(href)}" rel="noopener noreferrer">${e(s.url)}</a>` : `URL: ${e(s.url)}`)
    }
    if (idBits.length) parts.push(`<div class="meta">${idBits.join(' - ')} (${e(d.identifierUnverified)})</div>`)
    parts.push(`<div class="table-wrap"><table><tr><th>${e(d.version)}</th><th>${e(d.contentHash)}</th><th>${e(d.createdAt)} (UTC)</th></tr>`)
    for (const v of versions) {
      parts.push(`<tr><td>v${v.versionNo}</td><td><code>${e(v.contentHash)}</code></td><td>${e(v.createdAt)}${v.note ? ` - ${e(v.note)}` : ''}</td></tr>`)
    }
    parts.push(`</table></div>`)
    if (opts.includeSourceText) parts.push(`<h3>${e(d.sourceText)} (v${head.versionNo})</h3><blockquote>${e(head.text)}</blockquote>`)
    else parts.push(`<div class="meta">${e(d.sourceTextOmitted)}</div>`)
    parts.push(`</div>`)
  }
  parts.push(`<p class="meta">${e(d.hashNote)}</p>`)

  // History
  parts.push(`<h2>${e(d.history)} (${ws.history.length})</h2><div class="table-wrap"><table><tr><th>#</th><th>${e(d.time)} (UTC)</th><th>${e(d.event_)}</th></tr>`)
  ws.history.forEach((h, i) => {
    const label = d.event[h.type as keyof typeof d.event] ?? h.type
    const detail = describeEvent(h, claimLabel, sourceLabel)
    parts.push(`<tr><td>${i + 1}</td><td>${e(h.at)}</td><td>${e(label)}${detail ? ` - ${e(detail)}` : ''}</td></tr>`)
  })
  parts.push(`</table></div>`)
  parts.push(`<footer>${e(d.reportFooter)}</footer>`)

  return `<!doctype html>
<html lang="${opts.locale === 'zh-CN' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<title>${e(d.report)}: ${e(ws.meta.title)}</title>
<style>${CSS}</style>
</head>
<body>
${parts.join('\n')}
</body>
</html>
`
}

function describeEvent(h: Workspace['history'][number], claimLabel: (id: ID) => string, sourceLabel: (id: ID) => string): string {
  switch (h.type) {
    case 'source-added':
    case 'source-revised':
      return sourceLabel(h.sourceId)
    case 'source-renamed':
      return `${h.from} -> ${h.to}`
    case 'claim-added':
    case 'claim-edited':
    case 'review-added':
    case 'binding-added':
      return claimLabel(h.claimId)
    case 'dependency-added':
      return `${claimLabel(h.claimId)} -> ${claimLabel(h.dependsOnClaimId)} (${h.status})`
    case 'note':
      return h.text
    default:
      return ''
  }
}
