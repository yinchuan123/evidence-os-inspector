import type { ID, ImpactReport, Workspace } from '../core/types'
import { claimDisplayLabel } from '../core/workspace'
import type { UIStrings } from './strings'

export function ImpactBanner({
  ws,
  impact,
  s,
  onDismiss,
}: {
  ws: Workspace
  impact: ImpactReport
  s: UIStrings['ws']
  onDismiss: () => void
}) {
  const label = (id: ID) => claimDisplayLabel(ws, id)
  const source = ws.sources[impact.sourceId]
  const from = ws.sourceVersions[impact.fromVersionId]?.versionNo
  const to = ws.sourceVersions[impact.toVersionId]?.versionNo
  const list = (ids: ID[]) => (ids.length ? ids.map(label).join(', ') : s.none)
  return (
    <div className="impact" data-testid="impact-banner" role="status">
      <h3>
        {s.impactTitle}: {source?.title} v{from} → v{to}
      </h3>
      <dl>
        <dt>{s.direct}</dt>
        <dd data-testid="impact-direct">{list(impact.direct)}</dd>
        <dt>{s.indirect}</dt>
        <dd data-testid="impact-indirect">
          {impact.indirect.length
            ? impact.indirect.map((x) => (
                <div key={x.claimId}>
                  <strong>{label(x.claimId)}</strong> <span className="muted">({x.path.map(label).join(' → ')})</span>
                </div>
              ))
            : s.none}
        </dd>
        <dt>{s.potential}</dt>
        <dd data-testid="impact-potential">
          {impact.potential.length
            ? impact.potential.map((x) => (
                <div key={x.claimId}>
                  <strong>{label(x.claimId)}</strong> <span className="muted">({x.path.map(label).join(' → ')})</span>
                </div>
              ))
            : s.none}
        </dd>
        <dt>{s.unaffected}</dt>
        <dd data-testid="impact-unaffected">{list(impact.unaffected)}</dd>
      </dl>
      <p className="muted" data-testid="impact-note">
        {s.impactNote}
      </p>
      <div className="row">
        <button className="small" onClick={onDismiss}>
          {s.dismiss}
        </button>
      </div>
    </div>
  )
}
