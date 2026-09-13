import type { ID, Workspace } from '../core/types'

/** Display label for a claim: its label if set, otherwise its 1-based position. */
export function claimDisplayLabel(ws: Workspace, id: ID): string {
  const c = ws.claims[id]
  return c?.label ?? String((c?.order ?? 0) + 1)
}
