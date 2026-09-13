import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '../core/i18n'
import { safeHref } from '../core/report'
import type { ID, ImpactReport, Workspace } from '../core/types'
import { activeBindingsOf, addBinding, addSource, bindingsOf, computeImpact, renameSource, reviseSource, sourceVersionsOf } from '../core/workspace'
import type { BuiltDemo } from '../demos'
import { claimDisplayLabel } from './ClaimsPane'
import { readFileAsText } from './download'
import { selectionOffsets } from './selection'
import type { UIStrings } from './strings'

export interface SourcePaneProps {
  ws: Workspace
  setWs: (ws: Workspace) => void
  s: UIStrings['ws']
  d: Dictionary
  selectedClaimId: ID | null
  selectedSourceId: ID | null
  setSelectedSourceId: (id: ID | null) => void
  demo: BuiltDemo | null
  onImpact: (impact: ImpactReport) => void
}

export function SourcePane({ ws, setWs, s, d, selectedClaimId, selectedSourceId, setSelectedSourceId, demo, onImpact }: SourcePaneProps) {
  const [adding, setAdding] = useState(false)
  const [nTitle, setNTitle] = useState('')
  const [nDoi, setNDoi] = useState('')
  const [nUrl, setNUrl] = useState('')
  const [nText, setNText] = useState('')
  const [revising, setRevising] = useState(false)
  const [revText, setRevText] = useState('')
  const [revNote, setRevNote] = useState('')
  const [revMsg, setRevMsg] = useState('')
  const [viewVersionId, setViewVersionId] = useState<ID | null>(null)
  const [sel, setSel] = useState<{ start: number; end: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const textRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sources = Object.values(ws.sources)
  const source = selectedSourceId ? ws.sources[selectedSourceId] : undefined
  const versions = source ? sourceVersionsOf(ws, source.id) : []
  const head = source ? ws.sourceVersions[source.headVersionId] : undefined
  const viewing = source ? (viewVersionId && ws.sourceVersions[viewVersionId]?.sourceId === source.id ? ws.sourceVersions[viewVersionId] : head) : undefined

  useEffect(() => {
    if (!source && sources.length) setSelectedSourceId(sources[0].id)
  }, [source, sources, setSelectedSourceId])

  useEffect(() => {
    setViewVersionId(null)
    setRevising(false)
    setSel(null)
    setRenaming(false)
  }, [selectedSourceId])

  useEffect(() => {
    const onSel = () => {
      if (textRef.current) setSel(selectionOffsets(textRef.current))
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const saveNew = () => {
    if (!nTitle.trim() || !nText.trim()) return
    const r = addSource(ws, { title: nTitle.trim(), text: nText, doi: nDoi, url: nUrl })
    setWs(r.ws)
    setSelectedSourceId(r.sourceId)
    setAdding(false)
    setNTitle('')
    setNDoi('')
    setNUrl('')
    setNText('')
  }
  const importText = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      if (revising) setRevText(text)
      else {
        setNText(text)
        if (!nTitle) setNTitle(file.name)
      }
    } catch (e) {
      setRevMsg((e as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  const startRevise = () => {
    if (!head) return
    setRevText(head.text)
    setRevNote('')
    setRevMsg('')
    setRevising(true)
  }
  const saveRevision = () => {
    if (!source || !head) return
    const r = reviseSource(ws, { sourceId: source.id, text: revText, note: revNote.trim() || undefined })
    if (!r.changed) {
      setRevMsg(s.sameText)
      return
    }
    setWs(r.ws)
    onImpact(computeImpact(r.ws, { sourceId: source.id, fromVersionId: head.id, toVersionId: r.versionId }))
    setRevising(false)
    setViewVersionId(null)
  }
  const suggestion = demo?.suggestedCorrection && source && demo.suggestedCorrection.sourceId === source.id && head?.versionNo === 1 ? demo.suggestedCorrection : null

  const bindSel = () => {
    if (!source || !viewing || !selectedClaimId || !sel) return
    const r = addBinding(ws, { claimId: selectedClaimId, sourceId: source.id, sourceVersionId: viewing.id, start: sel.start, end: sel.end })
    setWs(r.ws)
    setSel(null)
    window.getSelection()?.removeAllRanges()
  }

  // Render text with <mark> for the selected claim's bindings on the viewed version (and faint marks for others).
  const renderText = () => {
    if (!viewing) return null
    const segs: { start: number; end: number; own: boolean }[] = []
    const all = Object.values(ws.bindings).filter((b) => b.sourceVersionId === viewing.id)
    for (const b of all) segs.push({ start: b.start, end: b.end, own: b.claimId === selectedClaimId })
    segs.sort((a, b) => a.start - b.start || b.end - a.end)
    const out: React.ReactNode[] = []
    let pos = 0
    for (const seg of segs) {
      if (seg.start < pos) continue // overlapping: skip (simple rendering)
      if (seg.start > pos) out.push(viewing.text.slice(pos, seg.start))
      out.push(
        <mark key={`${seg.start}-${seg.end}-${seg.own}`} className={seg.own ? 'own' : 'other'} title={seg.own ? s.boundHere : undefined}>
          {viewing.text.slice(seg.start, seg.end)}
        </mark>,
      )
      pos = seg.end
    }
    if (pos < viewing.text.length) out.push(viewing.text.slice(pos))
    return out
  }

  const doiHref = source?.doi ? safeHref(source.doi, 'doi') : null
  const urlHref = source?.url ? safeHref(source.url) : null

  return (
    <div>
      <h2>{s.sources}</h2>
      <div className="row">
        <select data-testid="source-select" value={source?.id ?? ''} onChange={(e) => setSelectedSourceId(e.target.value || null)} aria-label={s.sources} disabled={sources.length === 0}>
          {sources.length === 0 ? <option value="">—</option> : null}
          {sources.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
        <button className="small" data-testid="new-source-toggle" onClick={() => setAdding((v) => !v)}>
          {adding ? s.cancel : s.addSource}
        </button>
      </div>
      {sources.length === 0 && !adding ? <p className="muted">{s.noSources}</p> : null}

      {adding ? (
        <div className="card">
          <label className="field">{s.sourceTitle}</label>
          <input type="text" data-testid="new-source-title" value={nTitle} onChange={(e) => setNTitle(e.target.value)} />
          <label className="field">{s.sourceDoi}</label>
          <input type="text" data-testid="new-source-doi" value={nDoi} onChange={(e) => setNDoi(e.target.value)} />
          <label className="field">{s.sourceUrl}</label>
          <input type="text" data-testid="new-source-url" value={nUrl} onChange={(e) => setNUrl(e.target.value)} />
          <label className="field">{s.sourceText}</label>
          <textarea data-testid="new-source-text" value={nText} onChange={(e) => setNText(e.target.value)} style={{ minHeight: 140 }} />
          <div className="row">
            <button className="primary" data-testid="new-source-save" onClick={saveNew} disabled={!nTitle.trim() || !nText.trim()}>
              {s.saveSource}
            </button>
            <button className="small" onClick={() => fileRef.current?.click()}>
              {s.importText}
            </button>
          </div>
        </div>
      ) : null}
      <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(e) => importText(e.target.files?.[0])} />

      {source && head && viewing ? (
        <>
          <div className="row" style={{ marginTop: 10 }}>
            {renaming ? (
              <>
                <input type="text" value={renameText} onChange={(e) => setRenameText(e.target.value)} style={{ flex: 1 }} aria-label={s.rename} />
                <button
                  className="small"
                  onClick={() => {
                    if (renameText.trim()) setWs(renameSource(ws, { sourceId: source.id, title: renameText.trim() }))
                    setRenaming(false)
                  }}
                >
                  {s.rename}
                </button>
              </>
            ) : (
              <>
                <strong>{source.title}</strong>
                <button
                  className="small"
                  onClick={() => {
                    setRenameText(source.title)
                    setRenaming(true)
                  }}
                >
                  {s.rename}
                </button>
              </>
            )}
          </div>
          {source.doi || source.url ? (
            <div className="muted">
              {source.doi ? (
                <span>
                  DOI: {doiHref ? <a href={doiHref} target="_blank" rel="noopener noreferrer">{source.doi}</a> : <span>{source.doi}</span>}{' '}
                </span>
              ) : null}
              {source.url ? (
                <span>
                  URL: {urlHref ? <a href={urlHref} target="_blank" rel="noopener noreferrer">{source.url}</a> : <span>{source.url}</span>}{' '}
                </span>
              ) : null}
              <span>({s.unverified})</span>
            </div>
          ) : null}
          <div className="row">
            <label className="muted">{s.version}</label>
            <select value={viewing.id} onChange={(e) => setViewVersionId(e.target.value)} aria-label={s.version} style={{ flex: '0 1 220px' }}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNo}
                  {v.id === head.id ? ` (${s.current})` : ''}
                  {v.note ? ` — ${v.note}` : ''}
                </option>
              ))}
            </select>
            {!revising ? (
              <button className="small" data-testid="revise-source" onClick={startRevise}>
                {s.reviseSource}
              </button>
            ) : null}
          </div>
          <div className="muted mono">
            {s.hash}: {viewing.contentHash}
          </div>
          {viewing.id !== head.id ? <div className="notice">{s.viewingOld}</div> : null}

          {revising ? (
            <div className="card" style={{ marginTop: 8 }}>
              <p className="muted">{s.reviseHint}</p>
              {suggestion ? (
                <button
                  className="small"
                  data-testid="load-suggested-correction"
                  onClick={() => {
                    setRevText(suggestion.text)
                    setRevNote(suggestion.note)
                  }}
                >
                  {s.loadSuggested}
                </button>
              ) : null}
              <textarea data-testid="revise-text" value={revText} onChange={(e) => setRevText(e.target.value)} style={{ minHeight: 160 }} />
              <label className="field">{s.revisionNote}</label>
              <input type="text" data-testid="revise-note" value={revNote} onChange={(e) => setRevNote(e.target.value)} />
              <div className="row">
                <button className="primary" data-testid="save-revision" onClick={saveRevision}>
                  {s.saveRevision}
                </button>
                <button className="small" onClick={() => setRevising(false)}>
                  {s.cancel}
                </button>
                <button className="small" onClick={() => fileRef.current?.click()}>
                  {s.importText}
                </button>
                {revMsg ? <span className="muted">{revMsg}</span> : null}
              </div>
            </div>
          ) : null}

          <div className="source-text" data-testid="source-text" ref={textRef} lang="en">
            {renderText()}
          </div>
          <div className="row">
            {selectedClaimId ? (
              <>
                <button className="primary small" data-testid="bind-selection" onClick={bindSel} disabled={!sel}>
                  {s.bindSelection} {claimDisplayLabel(ws, selectedClaimId)}
                  {sel ? ` (${sel.start}–${sel.end})` : ''}
                </button>
                <span className="muted">{sel ? '' : s.selectionHint}</span>
              </>
            ) : (
              <span className="muted">{s.selectClaimFirst}</span>
            )}
          </div>
          {selectedClaimId ? (
            <p className="muted">
              {d.excerpt}: {activeBindingsOf(ws, selectedClaimId).filter((b) => b.sourceId === source.id).length} / {bindingsOf(ws, selectedClaimId).filter((b) => b.sourceId === source.id).length}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
