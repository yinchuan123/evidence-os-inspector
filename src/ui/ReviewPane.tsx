import { useState } from 'react'
import type { Dictionary } from '../core/i18n'
import type { ID, ReviewLabel, ReviewState, StaleReason, Workspace } from '../core/types'
import { activeBindingsOf, addBinding, addReview, claimVersionsOf, dependenciesOf, locateExcerpt, reviewsOf, supersededBindingsOf } from '../core/workspace'
import { claimDisplayLabel } from './labels'
import type { UIStrings } from './strings'
import { formatLocalTime } from './time'
import { EMPTY_DRAFT, type ReviewDraft } from './drafts'

const LABELS: Exclude<ReviewLabel, 'unreviewed'>[] = ['supported-in-scope', 'partially-supported', 'not-supported', 'cannot-determine']

export interface ReviewPaneProps {
  ws: Workspace
  setWs: (ws: Workspace) => void
  s: UIStrings['ws']
  d: Dictionary
  states: Map<ID, ReviewState>
  selectedClaimId: ID | null
  draft: ReviewDraft
  setDraft: (claimId: ID, draft: ReviewDraft) => void
}


export function ReviewPane({ ws, setWs, s, d, states, selectedClaimId, draft, setDraft }: ReviewPaneProps) {
  // No label is pre-selected: every review is an explicit choice.
  const { label, rationale, reviewer } = draft
  const update = (patch: Partial<ReviewDraft>) => selectedClaimId && setDraft(selectedClaimId, { ...draft, ...patch })
  const [msg, setMsg] = useState('')
  const [recorded, setRecorded] = useState(false)
  const [rebind, setRebind] = useState<Record<ID, { start: number; end: number } | 'not-found'>>({})

  if (!selectedClaimId || !ws.claims[selectedClaimId]) {
    return (
      <div>
        <h2>{s.review}</h2>
        <p className="muted">{s.selectClaimHint}</p>
      </div>
    )
  }
  const claim = ws.claims[selectedClaimId]
  const head = ws.claimVersions[claim.headVersionId]
  const st = states.get(claim.id)!
  const clabel = (id: ID) => claimDisplayLabel(ws, id)
  const slabel = (id: ID) => ws.sources[id]?.title ?? id
  const svNo = (id: ID) => ws.sourceVersions[id]?.versionNo ?? '?'
  const cvNo = (id: ID) => ws.claimVersions[id]?.versionNo ?? '?'

  const reasonText = (r: StaleReason): string => {
    switch (r.type) {
      case 'claim-edited':
        return `${d.reason[r.type]} (v${cvNo(r.reviewedVersionId)} → v${cvNo(r.currentVersionId)})`
      case 'source-changed':
        return `${d.reason[r.type]}: ${slabel(r.sourceId)} (v${svNo(r.reviewedVersionId)} → v${svNo(r.currentVersionId)})`
      case 'binding-added-after-review':
        return d.reason[r.type]
      case 'dependency-added-after-review':
        return `${d.reason[r.type]}: ${clabel(r.dependsOnClaimId)}`
      case 'upstream-needs-re-review':
        return `${d.reason[r.type]}: ${clabel(r.dependsOnClaimId)}. ${d.path}: ${r.path.map(clabel).join(' → ')}`
      case 'upstream-re-reviewed':
        return `${d.reason[r.type]}: ${clabel(r.dependsOnClaimId)}`
    }
  }

  const submit = () => {
    if (!label) {
      setMsg(s.labelRequired)
      return
    }
    if (!rationale.trim()) {
      setMsg(s.rationaleRequired)
      return
    }
    const r = addReview(ws, { claimId: claim.id, label, rationale: rationale.trim(), reviewer: reviewer.trim() || undefined })
    setWs(r.ws)
    setDraft(claim.id, { ...EMPTY_DRAFT, reviewer })
    setMsg('')
    setRecorded(true)
  }

  const active = activeBindingsOf(ws, claim.id)
  const superseded = supersededBindingsOf(ws, claim.id)
  const reviews = reviewsOf(ws, claim.id)

  const findInCurrent = (bindingId: ID) => {
    const b = ws.bindings[bindingId]
    const src = ws.sources[b.sourceId]
    const headText = ws.sourceVersions[src.headVersionId].text
    const span = locateExcerpt(headText, b.excerpt)
    setRebind((m) => ({ ...m, [bindingId]: span ?? 'not-found' }))
  }
  const applyRebind = (bindingId: ID) => {
    const b = ws.bindings[bindingId]
    const span = rebind[bindingId]
    if (!span || span === 'not-found') return
    const r = addBinding(ws, { claimId: claim.id, sourceId: b.sourceId, start: span.start, end: span.end })
    setWs(r.ws)
    setRebind((m) => {
      const n = { ...m }
      delete n[bindingId]
      return n
    })
  }

  return (
    <div>
      <h2>{s.review}</h2>
      <div className="row">
        <strong>{clabel(claim.id)}</strong>
        <span className="muted">v{head.versionNo}</span>
        <span className={`state wrap ${st.kind}`} data-testid="review-state">
          {d.state[st.kind]}
        </span>
      </div>
      {st.kind !== 'unreviewed' ? (
        <div className="muted" data-testid="review-last-verdict">
          {s.lastVerdict}: <strong>{d.label[st.label]}</strong>
        </div>
      ) : null}
      <p>{head.text}</p>
      {st.kind === 'needs-re-review' ? (
        <div className="notice" data-testid="review-reasons">
          <strong>{s.reasons}</strong>
          <ul>
            {st.reasons.map((r, i) => (
              <li key={i}>{reasonText(r)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="muted">{s.stateNote}</p>

      <h3>{s.boundPassages}</h3>
      {active.length === 0 ? (
        <p className="muted">{dependenciesOf(ws, claim.id).some((x) => x.status === 'confirmed') ? s.noBindingsDependent : s.noBindingsYet}</p>
      ) : null}
      {active.map((b) => {
        const src = ws.sources[b.sourceId]
        const stale = src.headVersionId !== b.sourceVersionId
        const rb = rebind[b.id]
        return (
          <div key={b.id}>
            <div className="muted">
              {slabel(b.sourceId)} v{svNo(b.sourceVersionId)} · {d.position} {b.start}–{b.end}
              {stale ? (
                <>
                  {' '}
                  <span className="state needs-re-review">
                    {d.reason['source-changed']} → v{svNo(src.headVersionId)}
                  </span>
                </>
              ) : null}
            </div>
            <blockquote className="excerpt">{b.excerpt}</blockquote>
            {stale ? (
              <div className="row">
                <button className="small" data-testid="rebind-find" onClick={() => findInCurrent(b.id)}>
                  {s.findInCurrent}
                </button>
                {rb && rb !== 'not-found' ? (
                  <button className="small primary" data-testid="rebind-apply" onClick={() => applyRebind(b.id)}>
                    {s.rebindAt} {rb.start}–{rb.end}
                  </button>
                ) : null}
                {rb === 'not-found' ? (
                  <span className="muted hint" data-testid="rebind-not-found">
                    {s.notFound}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
      {superseded.length ? (
        <>
          <h3>{s.supersededPassages}</h3>
          {superseded.map((b) => (
            <div key={b.id} className="muted">
              {slabel(b.sourceId)} v{svNo(b.sourceVersionId)} · {b.start}–{b.end}: <em>{b.excerpt.length > 120 ? b.excerpt.slice(0, 120) + '…' : b.excerpt}</em>
            </div>
          ))}
        </>
      ) : null}

      <h3>{s.recordReview(head.versionNo)}</h3>
      {recorded ? (
        <div className="notice ok" data-testid="review-recorded" role="status">
          {s.reviewRecorded(clabel(claim.id))}
        </div>
      ) : null}
      <fieldset className="labels">
        <legend className="sr-only">{s.review}</legend>
        {LABELS.map((l) => (
          <label key={l}>
            <input type="radio" name="review-label" data-testid={`review-label-${l}`} checked={label === l} onChange={() => { update({ label: l }); setRecorded(false) }} /> {d.label[l]}
          </label>
        ))}
      </fieldset>
      <label className="field">{s.rationale}</label>
      <textarea data-testid="review-rationale" aria-label={s.rationale} value={rationale} onChange={(e) => { update({ rationale: e.target.value }); setRecorded(false) }} placeholder={s.rationalePlaceholder} />
      <label className="field">{s.reviewer}</label>
      <input type="text" aria-label={s.reviewer} value={reviewer} onChange={(e) => update({ reviewer: e.target.value })} />
      <div className="row">
        <button className="primary" data-testid="review-submit" onClick={submit}>
          {s.submitReview}
        </button>
        {msg ? (
          <span className="error" data-testid="review-error">
            {msg}
          </span>
        ) : null}
      </div>

      <h3>{s.reviewHistory}</h3>
      {reviews.length === 0 ? (
        <p className="muted">{s.noHistory}</p>
      ) : (
        <ol className="review-history" data-testid="review-history">
          {reviews.map((r, i) => (
            <li key={r.id} className={i === reviews.length - 1 ? 'latest' : ''}>
              <div className="row">
                <strong>
                  #{i + 1}
                  {i === reviews.length - 1 ? ` · ${s.latest}` : ''}
                </strong>
                <span className="muted">v{cvNo(r.claimVersionId)}</span>
                <span className="badge">{d.label[r.label]}</span>
                <span className="muted">{formatLocalTime(r.createdAt)}</span>
              </div>
              <div>{r.rationale}</div>
              {r.reviewer ? <div className="muted">— {r.reviewer}</div> : null}
              <div className="muted">
                {s.basedOn}:{' '}
                {[...r.basisSources.map((b) => `${slabel(b.sourceId)} v${svNo(b.sourceVersionId)}`), ...r.basisClaims.map((b) => `${clabel(b.claimId)} v${cvNo(b.claimVersionId)}`)].join('; ') || '—'}
              </div>
            </li>
          ))}
        </ol>
      )}

      <h3>{s.claimVersions}</h3>
      <table className="compact">
        <tbody>
          {claimVersionsOf(ws, claim.id).map((v) => (
            <tr key={v.id}>
              <td className="nowrap">v{v.versionNo}</td>
              <td>{v.text}</td>
              <td className="mono muted nowrap">{v.contentHash.slice(0, 12)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
