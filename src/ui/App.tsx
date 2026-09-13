import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '../core/i18n'
import { exportWorkspace, importWorkspace } from '../core/serialize'
import type { Workspace } from '../core/types'
import { createWorkspace } from '../core/workspace'
import { buildDemo, DEMOS, type BuiltDemo, type DemoId } from '../demos'
import { Landing } from './Landing'
import { UI } from './strings'
import { WorkspaceView } from './Workspace'

const LOCALE_KEY = 'eosi.locale'
const SESSION_KEY = 'eosi.workspace'

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'en' || stored === 'zh-CN') return stored
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

function parseHash(): { kind: 'landing' } | { kind: 'demo'; id: DemoId } | { kind: 'workspace' } {
  const h = window.location.hash.replace(/^#/, '')
  if (h.startsWith('demo/')) {
    const id = h.slice(5)
    if (DEMOS.some((d) => d.id === id)) return { kind: 'demo', id: id as DemoId }
  }
  if (h === 'workspace' || h === 'new') return { kind: 'workspace' }
  return { kind: 'landing' }
}

export function App() {
  const [locale, setLocale] = useState<Locale>(detectLocale)
  const [ws, setWsState] = useState<Workspace | null>(null)
  const [demo, setDemo] = useState<BuiltDemo | null>(null)
  const [demoId, setDemoId] = useState<DemoId | null>(null)

  // Only the user's own workspace is kept in session storage. Demo workspaces are
  // rebuilt fresh on every load so they never overwrite the user's work. What
  // counts is how the workspace was opened (demo route or own workspace), not the
  // file's synthetic flag: a demo export the user imports becomes their workspace.
  const persistRef = useRef(false)
  const persist = (next: Workspace) => {
    try {
      sessionStorage.setItem(SESSION_KEY, exportWorkspace(next))
    } catch {
      /* quota or unavailable: in-memory only */
    }
  }
  const setWs = useCallback((next: Workspace) => {
    setWsState(next)
    if (persistRef.current) persist(next)
  }, [])

  const openDemo = useCallback(
    (id: DemoId) => {
      const built = buildDemo(id)
      persistRef.current = false
      setDemo(built)
      setDemoId(id)
      setWs(built.ws)
      if (window.location.hash !== `#demo/${id}`) window.location.hash = `demo/${id}`
    },
    [setWs],
  )

  const openOwn = useCallback(
    (fresh: boolean) => {
      persistRef.current = true
      setDemo(null)
      setDemoId(null)
      let restored: Workspace | null = null
      if (!fresh) {
        try {
          const saved = sessionStorage.getItem(SESSION_KEY)
          if (saved) {
            const r = importWorkspace(saved)
            if (r.ok) restored = r.ws
          }
        } catch {
          /* ignore */
        }
      }
      setWs(restored ?? createWorkspace({ title: UI[locale].ws.newWorkspaceTitle, synthetic: false }))
      if (window.location.hash !== '#workspace') window.location.hash = 'workspace'
    },
    [locale, setWs],
  )

  // Route on load and on hash changes (back/forward, refresh).
  useEffect(() => {
    const route = () => {
      const r = parseHash()
      if (r.kind === 'demo') {
        if (demoId !== r.id) openDemo(r.id)
      } else if (r.kind === 'workspace') {
        if (!ws || demoId) openOwn(false)
      } else {
        persistRef.current = false
        setWsState(null)
        setDemo(null)
        setDemoId(null)
      }
    }
    route()
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoId, ws === null])

  const toggleLocale = () => {
    const next: Locale = locale === 'en' ? 'zh-CN' : 'en'
    setLocale(next)
    try {
      localStorage.setItem(LOCALE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
  }, [locale])

  if (!ws) {
    return <Landing locale={locale} onDemo={openDemo} onOwn={() => openOwn(false)} onToggleLocale={toggleLocale} />
  }
  return (
    <WorkspaceView
      ws={ws}
      setWs={setWs}
      locale={locale}
      demo={demo}
      demoId={demoId}
      onHome={() => {
        window.location.hash = ''
      }}
      onWorkspaceButton={() => {
        // Inside a demo this button only opens the user's own workspace; it never discards it.
        if (demoId) {
          openOwn(false)
          return
        }
        const claims = Object.keys(ws.claims).length
        const sources = Object.keys(ws.sources).length
        const empty = claims === 0 && sources === 0
        if (!empty && !window.confirm(UI[locale].ws.confirmDiscard(ws.meta.title, claims, sources))) return
        try {
          sessionStorage.removeItem(SESSION_KEY)
        } catch {
          /* ignore */
        }
        openOwn(true)
      }}
      onImported={(next) => {
        // An explicitly imported file becomes the user's own workspace.
        persistRef.current = true
        persist(next)
        setDemo(null)
        setDemoId(null)
        setWsState(next)
        if (window.location.hash !== '#workspace') window.location.hash = 'workspace'
      }}
      onToggleLocale={toggleLocale}
    />
  )
}
