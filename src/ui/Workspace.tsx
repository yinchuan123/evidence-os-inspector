import { useMemo, useRef, useState } from 'react'
import { t, type Locale } from '../core/i18n'
import { renderReport } from '../core/report'
import { exportWorkspace, importWorkspace } from '../core/serialize'
import type { ID, ImpactReport, Workspace as WS } from '../core/types'
import { allClaimStates } from '../core/workspace'
import type { BuiltDemo, DemoId } from '../demos'
import { ClaimsPane } from './ClaimsPane'
import { downloadText, readFileAsText, safeFilename } from './download'
import { HistoryList } from './HistoryList'
import { ImpactBanner } from './ImpactBanner'
import { ReviewPane } from './ReviewPane'
import { SourcePane } from './SourcePane'
import { UI } from './strings'

type Tab = 'claims' | 'source' | 'review' | 'history'

export interface WorkspaceViewProps {
  ws: WS
  setWs: (ws: WS) => void
  locale: Locale
  demo: BuiltDemo | null
  demoId: DemoId | null
  onHome: () => void
  onWorkspaceButton: () => void
  onImported: (ws: WS) => void
  onToggleLocale: () => void
}

export function WorkspaceView({ ws, setWs, locale, demo, demoId, onHome, onWorkspaceButton, onImported, onToggleLocale }: WorkspaceViewProps) {
  const s = UI[locale].ws
  const nav = UI[locale].nav
  const d = t(locale)
  const [selectedClaimId, setSelectedClaimId] = useState<ID | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<ID | null>(null)
  const [impact, setImpact] = useState<ImpactReport | null>(null)
  const [tab, setTab] = useState<Tab>('claims')
  const [importError, setImportError] = useState<string[] | null>(null)
  const [includeSourceText, setIncludeSourceText] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const states = useMemo(() => allClaimStates(ws), [ws])

  const exportJson = () => downloadText(safeFilename(ws.meta.title, 'json'), exportWorkspace(ws), 'application/json')
  const exportReport = () => downloadText(safeFilename(ws.meta.title + '-report', 'html'), renderReport(ws, { locale, includeSourceText }), 'text/html')
  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      const res = importWorkspace(text)
      if (!res.ok) {
        setImportError(res.errors.slice(0, 8))
        return
      }
      setImportError(null)
      onImported(res.ws)
      setSelectedClaimId(null)
      setSelectedSourceId(null)
      setImpact(null)
    } catch (e) {
      setImportError([(e as Error).message])
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  const guide = demoId === 'correction-impact' ? s.guideCorrection : demoId === 'scope-check' ? s.guideScope : demoId === 'missing-then-supplemented' ? s.guideMissing : null

  const tabs: Tab[] = ['claims', 'source', 'review', 'history']

  return (
    <div className="workspace">
      <header className="topbar">
        <a className="brand" href="#" data-testid="home-link" onClick={(e) => { e.preventDefault(); onHome() }}>
          {d.appName}
        </a>
        <span className="title" data-testid="ws-title">
          {ws.meta.title}
        </span>
        {ws.meta.synthetic ? (
          <span className="badge synthetic" data-testid="synthetic-badge">
            {s.syntheticBadge}
          </span>
        ) : null}
        <span className="spacer" />
        <button className="small" data-testid="export-json" onClick={exportJson}>
          {s.exportJson}
        </button>
        <button className="small" data-testid="export-report" onClick={exportReport}>
          {s.exportReport}
        </button>
        <label className="check">
          <input type="checkbox" data-testid="include-source-text" checked={includeSourceText} onChange={(e) => setIncludeSourceText(e.target.checked)} />
          {s.includeSourceText}
        </label>
        <button className="small" onClick={() => importRef.current?.click()}>
          {s.importJson}
        </button>
        <input ref={importRef} data-testid="import-json-input" type="file" accept=".json,application/json" className="sr-only" onChange={(e) => onImport(e.target.files?.[0])} />
        <button className="small" data-testid="workspace-button" onClick={onWorkspaceButton}>
          {demoId ? s.openMyWorkspace : s.newWorkspace}
        </button>
        <button className="small" data-testid="locale-toggle" onClick={onToggleLocale}>
          {nav.switchLocale}
        </button>
        <button className="small home-btn" onClick={onHome}>
          {nav.home}
        </button>
      </header>

      {importError ? (
        <div className="error" data-testid="import-error" style={{ margin: '8px 16px 0' }}>
          <strong>{s.importError}</strong>
          <ul>
            {importError.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <button className="small" onClick={() => setImportError(null)}>
            {s.dismiss}
          </button>
        </div>
      ) : null}

      {impact ? <ImpactBanner ws={ws} impact={impact} s={s} onDismiss={() => setImpact(null)} /> : null}

      <nav className="tabs" aria-label="panes">
        {tabs.map((tb) => (
          <button key={tb} className={tab === tb ? 'active' : ''} data-testid={`tab-${tb}`} onClick={() => setTab(tb)}>
            {s.tabs[tb]}
          </button>
        ))}
      </nav>

      <div className="panes">
        <section className={`pane${tab === 'claims' ? ' active' : ''}`} aria-label={s.tabs.claims}>
          {guide ? (
            <div className="guide">
              <strong>{s.guideTitle}</strong>
              <ol>
                {guide.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ol>
            </div>
          ) : null}
          <ClaimsPane ws={ws} setWs={setWs} s={s} d={d} states={states} selectedClaimId={selectedClaimId} setSelectedClaimId={setSelectedClaimId} />
        </section>
        <section className={`pane${tab === 'source' ? ' active' : ''}`} aria-label={s.tabs.source}>
          <SourcePane
            key={selectedSourceId ?? 'none'}
            ws={ws}
            setWs={setWs}
            s={s}
            d={d}
            selectedClaimId={selectedClaimId}
            selectedSourceId={selectedSourceId}
            setSelectedSourceId={setSelectedSourceId}
            demo={demo}
            onImpact={setImpact}
          />
        </section>
        <section className={`pane${tab === 'review' || tab === 'history' ? ' active' : ''}`} aria-label={s.tabs.review}>
          {tab === 'history' ? (
            <>
              <h2>{s.history}</h2>
              <HistoryList ws={ws} d={d} s={s} />
            </>
          ) : (
            <>
              <ReviewPane key={selectedClaimId ?? 'none'} ws={ws} setWs={setWs} s={s} d={d} states={states} selectedClaimId={selectedClaimId} />
              <details style={{ marginTop: 16 }} className="desktop-history">
                <summary className="muted">
                  {s.history} ({ws.history.length})
                </summary>
                <HistoryList ws={ws} d={d} s={s} />
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
