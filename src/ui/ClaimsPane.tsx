import { useRef, useState } from 'react'
import type { Dictionary } from '../core/i18n'
import { splitSentences } from '../core/sentences'
import type { DependencyStatus, ID, ReviewState, Workspace } from '../core/types'
import {
  addClaim,
  addDependency,
  claimsInOrder,
  confirmDependency,
  dependenciesOf,
  dependentsOf,
  editClaim,
  relabelClaim,
  removeDependency,
} from '../core/workspace'
import { readFileAsText } from './download'
import { claimDisplayLabel } from './labels'
import type { UIStrings } from './strings'

export interface ClaimsPaneProps {
  ws: Workspace
  setWs: (ws: Workspace) => void
  s: UIStrings['ws']
  d: Dictionary
  states: Map<ID, ReviewState>
  selectedClaimId: ID | null
  setSelectedClaimId: (id: ID | null) => void
}

export function ClaimsPane({ ws, setWs, s, d, states, selectedClaimId, setSelectedClaimId }: ClaimsPaneProps) {
  const [draft, setDraft] = useState('')
  const [fileMsg, setFileMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const claims = claimsInOrder(ws)

  const addOne = () => {
    const text = draft.trim()
    if (!text) return
    const r = addClaim(ws, { text })
    setWs(r.ws)
    setSelectedClaimId(r.claimId)
    setDraft('')
  }
  const addSplit = () => {
    const parts = splitSentences(draft)
    if (parts.length === 0) return
    let next = ws
    let last: ID | null = null
    for (const p of parts) {
      const r = addClaim(next, { text: p.text })
      next = r.ws
      last = r.claimId
    }
    setWs(next)
    setSelectedClaimId(last)
    setDraft('')
  }
  const importText = async (file: File | undefined) => {
    if (!file) return
    try {
      setDraft(await readFileAsText(file))
      setFileMsg('')
    } catch (e) {
      setFileMsg((e as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <h2>{s.claims}</h2>
      {claims.length === 0 ? <p className="muted">{s.noClaims}</p> : null}
      <ul className="claim-list">
        {claims.map((c) => {
          const st = states.get(c.id)!
          const label = claimDisplayLabel(ws, c.id)
          return (
            <li
              key={c.id}
              className={`claim-item${c.id === selectedClaimId ? ' selected' : ''}`}
              data-testid={`claim-item-${label}`}
              data-state={st.kind}
              onClick={() => setSelectedClaimId(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedClaimId(c.id)
              }}
              tabIndex={0}
              role="button"
              aria-pressed={c.id === selectedClaimId}
            >
              <div className="head">
                <span className="label">{label}</span>
                <span className="muted">v{ws.claimVersions[c.headVersionId].versionNo}</span>
                <span className={`state ${st.kind}`}>{d.state[st.kind]}</span>
              </div>
              <div className="text">{ws.claimVersions[c.headVersionId].text}</div>
            </li>
          )
        })}
      </ul>

      <h3>{s.addClaims}</h3>
      <textarea data-testid="add-claims-text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={s.addClaimsPlaceholder} />
      <div className="row">
        <button className="primary" data-testid="add-claim-single" onClick={addOne} disabled={!draft.trim()}>
          {s.addAsOne}
        </button>
        <button data-testid="add-claims-split" onClick={addSplit} disabled={!draft.trim()}>
          {s.splitAndAdd}
        </button>
        <button className="small" onClick={() => fileRef.current?.click()}>
          {s.importText}
        </button>
        <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(e) => importText(e.target.files?.[0])} />
        {fileMsg ? <span className="error">{fileMsg}</span> : null}
      </div>

      {selectedClaimId && ws.claims[selectedClaimId] ? (
        <ClaimEditor key={selectedClaimId} ws={ws} setWs={setWs} s={s} claimId={selectedClaimId} />
      ) : null}
    </div>
  )
}

function ClaimEditor({ ws, setWs, s, claimId }: { ws: Workspace; setWs: (ws: Workspace) => void; s: UIStrings['ws']; claimId: ID }) {
  const claim = ws.claims[claimId]
  const headText = ws.claimVersions[claim.headVersionId].text
  const [editText, setEditText] = useState(headText)
  const [editLabel, setEditLabel] = useState(claim.label ?? '')
  const [editMsg, setEditMsg] = useState('')
  const [depTarget, setDepTarget] = useState('')
  const [depStatus, setDepStatus] = useState<DependencyStatus>('confirmed')
  const [depError, setDepError] = useState('')
  const claims = claimsInOrder(ws)

  const saveEdit = () => {
    const r = editClaim(ws, { claimId, text: editText })
    if (!r.changed) {
      setEditMsg(s.claimUnchanged)
      return
    }
    setWs(r.ws)
    setEditMsg('')
  }
  const saveLabel = () => setWs(relabelClaim(ws, { claimId, label: editLabel }))
  const addDep = () => {
    if (!depTarget) return
    try {
      const r = addDependency(ws, { claimId, dependsOnClaimId: depTarget, status: depStatus })
      setWs(r.ws)
      setDepTarget('')
      setDepError('')
    } catch (e) {
      setDepError((e as Error).message)
    }
  }

  return (
    <>
      <h3>
        {s.selectedClaim}: {claimDisplayLabel(ws, claimId)}
      </h3>
      <label className="field">{s.labelField}</label>
      <div className="row">
        <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={saveLabel} style={{ flex: 1 }} aria-label={s.labelField} />
      </div>
      <label className="field">{s.claimText}</label>
      <textarea data-testid="claim-edit-text" value={editText} onChange={(e) => setEditText(e.target.value)} />
      <div className="row">
        <button data-testid="claim-edit-save" onClick={saveEdit} disabled={editText.trim() === '' || editText === headText}>
          {s.saveClaimText}
        </button>
        {editMsg ? <span className="muted">{editMsg}</span> : null}
      </div>

      <h3>{s.dependencies}</h3>
      {dependenciesOf(ws, claimId).length === 0 ? <p className="muted">{s.noDependencies}</p> : null}
      {dependenciesOf(ws, claimId).map((dep) => (
        <div className="row" key={dep.id}>
          <span>
            {s.dependsOn} <strong>{claimDisplayLabel(ws, dep.dependsOnClaimId)}</strong> <span className="badge">{s.depStatus[dep.status]}</span>
          </span>
          {dep.status === 'unconfirmed' ? (
            <button className="small" onClick={() => setWs(confirmDependency(ws, dep.id))}>
              {s.confirm}
            </button>
          ) : null}
          <button className="small" onClick={() => setWs(removeDependency(ws, dep.id))}>
            {s.remove}
          </button>
        </div>
      ))}
      {dependentsOf(ws, claimId).length ? (
        <p className="muted">
          {s.dependedOnBy}: {dependentsOf(ws, claimId).map((x) => claimDisplayLabel(ws, x.claimId)).join(', ')}
        </p>
      ) : null}
      <div className="row">
        <select data-testid="dep-target-select" value={depTarget} onChange={(e) => setDepTarget(e.target.value)} aria-label={s.addDependency}>
          <option value="">{s.chooseClaim}</option>
          {claims
            .filter((c) => c.id !== claimId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {claimDisplayLabel(ws, c.id)}
              </option>
            ))}
        </select>
        <select data-testid="dep-status-select" value={depStatus} onChange={(e) => setDepStatus(e.target.value as DependencyStatus)} aria-label="status">
          <option value="confirmed">{s.depStatus.confirmed}</option>
          <option value="unconfirmed">{s.depStatus.unconfirmed}</option>
        </select>
        <button className="small" data-testid="dep-add" onClick={addDep} disabled={!depTarget}>
          {s.addDependency}
        </button>
      </div>
      {depError ? (
        <div className="error" data-testid="dep-error">
          {depError}
        </div>
      ) : null}
    </>
  )
}
