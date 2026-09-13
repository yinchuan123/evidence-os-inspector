import type { Dictionary } from '../core/i18n'
import type { ID, Workspace } from '../core/types'
import { claimDisplayLabel } from '../core/workspace'
import { formatLocalTime } from './time'
import type { UIStrings } from './strings'

export function HistoryList({ ws, d, s }: { ws: Workspace; d: Dictionary; s: UIStrings['ws'] }) {
  const claimLabel = (id: ID) => claimDisplayLabel(ws, id)
  const sourceLabel = (id: ID) => ws.sources[id]?.title ?? id
  const detail = (h: Workspace['history'][number]): string => {
    switch (h.type) {
      case 'source-added':
      case 'source-revised':
        return sourceLabel(h.sourceId)
      case 'source-renamed':
        return `${h.from} → ${h.to}`
      case 'claim-added':
      case 'claim-edited':
      case 'review-added':
      case 'binding-added':
        return claimLabel(h.claimId)
      case 'dependency-added':
        return `${claimLabel(h.claimId)} → ${claimLabel(h.dependsOnClaimId)} (${h.status === 'confirmed' ? d.confirmed : d.unconfirmed})`
      case 'note':
        return h.text
      default:
        return ''
    }
  }
  if (ws.history.length === 0) return <p className="muted">{s.noHistory}</p>
  return (
    <ol className="history-list" data-testid="history-list">
      {[...ws.history].reverse().map((h, i) => (
        <li key={h.id}>
          <span className="muted mono">{ws.history.length - i}. </span>
          <span className="muted">{formatLocalTime(h.at)}</span> · <strong>{d.event[h.type]}</strong>
          {detail(h) ? <> — {detail(h)}</> : null}
        </li>
      ))}
    </ol>
  )
}
