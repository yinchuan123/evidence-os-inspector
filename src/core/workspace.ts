import { sha256Hex } from './hash'
import {
  WORKSPACE_FORMAT,
  WORKSPACE_FORMAT_VERSION,
  type Binding,
  type Claim,
  type ClaimVersion,
  type Dependency,
  type DependencyStatus,
  type HistoryEvent,
  type ID,
  type ImpactReport,
  type Review,
  type ReviewBasisClaim,
  type ReviewBasisSource,
  type ReviewLabel,
  type ReviewState,
  type Source,
  type SourceVersion,
  type StaleReason,
  type Workspace,
  type WorkspaceMeta,
} from './types'

export type Clock = () => string
export const systemClock: Clock = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nextId(ws: Workspace, prefix: string): { ws: Workspace; id: ID } {
  const id = `${prefix}_${ws.nextId}`
  return { ws: { ...ws, nextId: ws.nextId + 1 }, id }
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never
type EventBody = DistributiveOmit<HistoryEvent, 'id' | 'at'>

function pushEvent(ws: Workspace, ev: EventBody, clock: Clock): Workspace {
  const n = nextId(ws, 'ev')
  const event = { id: n.id, at: clock(), ...ev } as HistoryEvent
  return { ...n.ws, history: [...n.ws.history, event] }
}

function requireSource(ws: Workspace, id: ID): Source {
  const s = ws.sources[id]
  if (!s) throw new Error(`Unknown source: ${id}`)
  return s
}

function requireClaim(ws: Workspace, id: ID): Claim {
  const c = ws.claims[id]
  if (!c) throw new Error(`Unknown claim: ${id}`)
  return c
}

/** Deterministic ordering helper: history order == id number order. */
function idNumber(id: ID): number {
  return Number(id.slice(id.lastIndexOf('_') + 1))
}

function sortedByCreation<T extends { id: ID }>(items: T[]): T[] {
  return [...items].sort((a, b) => idNumber(a.id) - idNumber(b.id))
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export function createWorkspace(meta: WorkspaceMeta, clock: Clock = systemClock): Workspace {
  const ws: Workspace = {
    format: WORKSPACE_FORMAT,
    formatVersion: WORKSPACE_FORMAT_VERSION,
    meta,
    nextId: 1,
    sources: {},
    sourceVersions: {},
    claims: {},
    claimVersions: {},
    bindings: {},
    reviews: {},
    dependencies: {},
    history: [],
  }
  return pushEvent(ws, { type: 'workspace-created' }, clock)
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export interface AddSourceArgs {
  title: string
  text: string
  doi?: string
  url?: string
  note?: string
}

export function addSource(ws: Workspace, args: AddSourceArgs, clock: Clock = systemClock) {
  const s = nextId(ws, 'src')
  const v = nextId(s.ws, 'sv')
  const at = clock()
  const doi = args.doi?.trim() || undefined
  const url = args.url?.trim() || undefined
  const version: SourceVersion = {
    id: v.id,
    sourceId: s.id,
    versionNo: 1,
    text: args.text,
    contentHash: sha256Hex(args.text),
    createdAt: at,
    ...(args.note ? { note: args.note } : {}),
  }
  const source: Source = {
    id: s.id,
    title: args.title,
    ...(doi ? { doi } : {}),
    ...(url ? { url } : {}),
    identifierStatus: doi || url ? 'user-provided-unverified' : 'none',
    headVersionId: v.id,
    createdAt: at,
  }
  let next: Workspace = {
    ...v.ws,
    sources: { ...v.ws.sources, [s.id]: source },
    sourceVersions: { ...v.ws.sourceVersions, [v.id]: version },
  }
  next = pushEvent(next, { type: 'source-added', sourceId: s.id, versionId: v.id }, clock)
  return { ws: next, sourceId: s.id, versionId: v.id }
}

export function reviseSource(
  ws: Workspace,
  args: { sourceId: ID; text: string; note?: string },
  clock: Clock = systemClock,
) {
  const source = requireSource(ws, args.sourceId)
  const head = ws.sourceVersions[source.headVersionId]
  if (head.text === args.text) return { ws, versionId: head.id, changed: false as const }
  const v = nextId(ws, 'sv')
  const version: SourceVersion = {
    id: v.id,
    sourceId: source.id,
    versionNo: head.versionNo + 1,
    text: args.text,
    contentHash: sha256Hex(args.text),
    createdAt: clock(),
    ...(args.note ? { note: args.note } : {}),
  }
  let next: Workspace = {
    ...v.ws,
    sources: { ...v.ws.sources, [source.id]: { ...source, headVersionId: v.id } },
    sourceVersions: { ...v.ws.sourceVersions, [v.id]: version },
  }
  next = pushEvent(next, { type: 'source-revised', sourceId: source.id, fromVersionId: head.id, toVersionId: v.id }, clock)
  return { ws: next, versionId: v.id, changed: true as const }
}

export function renameSource(ws: Workspace, args: { sourceId: ID; title: string }, clock: Clock = systemClock): Workspace {
  const source = requireSource(ws, args.sourceId)
  if (source.title === args.title) return ws
  const next: Workspace = { ...ws, sources: { ...ws.sources, [source.id]: { ...source, title: args.title } } }
  return pushEvent(next, { type: 'source-renamed', sourceId: source.id, from: source.title, to: args.title }, clock)
}

export function sourceVersionsOf(ws: Workspace, sourceId: ID): SourceVersion[] {
  return sortedByCreation(Object.values(ws.sourceVersions).filter((v) => v.sourceId === sourceId))
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export function addClaim(ws: Workspace, args: { text: string; label?: string }, clock: Clock = systemClock) {
  const c = nextId(ws, 'clm')
  const v = nextId(c.ws, 'cv')
  const at = clock()
  const order = Object.keys(ws.claims).length
  const version: ClaimVersion = { id: v.id, claimId: c.id, versionNo: 1, text: args.text, contentHash: sha256Hex(args.text), createdAt: at }
  const claim: Claim = { id: c.id, ...(args.label ? { label: args.label } : {}), headVersionId: v.id, createdAt: at, order }
  let next: Workspace = {
    ...v.ws,
    claims: { ...v.ws.claims, [c.id]: claim },
    claimVersions: { ...v.ws.claimVersions, [v.id]: version },
  }
  next = pushEvent(next, { type: 'claim-added', claimId: c.id, versionId: v.id }, clock)
  return { ws: next, claimId: c.id, versionId: v.id }
}

export function editClaim(ws: Workspace, args: { claimId: ID; text: string }, clock: Clock = systemClock) {
  const claim = requireClaim(ws, args.claimId)
  const head = ws.claimVersions[claim.headVersionId]
  if (head.text === args.text) return { ws, versionId: head.id, changed: false as const }
  const v = nextId(ws, 'cv')
  const version: ClaimVersion = {
    id: v.id,
    claimId: claim.id,
    versionNo: head.versionNo + 1,
    text: args.text,
    contentHash: sha256Hex(args.text),
    createdAt: clock(),
  }
  let next: Workspace = {
    ...v.ws,
    claims: { ...v.ws.claims, [claim.id]: { ...claim, headVersionId: v.id } },
    claimVersions: { ...v.ws.claimVersions, [v.id]: version },
  }
  next = pushEvent(next, { type: 'claim-edited', claimId: claim.id, fromVersionId: head.id, toVersionId: v.id }, clock)
  return { ws: next, versionId: v.id, changed: true as const }
}

export function relabelClaim(ws: Workspace, args: { claimId: ID; label: string }): Workspace {
  const claim = requireClaim(ws, args.claimId)
  const label = args.label.trim()
  const updated: Claim = { ...claim }
  if (label) updated.label = label
  else delete updated.label
  return { ...ws, claims: { ...ws.claims, [claim.id]: updated } }
}

export function claimsInOrder(ws: Workspace): Claim[] {
  return Object.values(ws.claims).sort((a, b) => a.order - b.order)
}

export function claimVersionsOf(ws: Workspace, claimId: ID): ClaimVersion[] {
  return sortedByCreation(Object.values(ws.claimVersions).filter((v) => v.claimId === claimId))
}

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

export function addBinding(
  ws: Workspace,
  args: { claimId: ID; sourceId: ID; start: number; end: number; sourceVersionId?: ID },
  clock: Clock = systemClock,
) {
  requireClaim(ws, args.claimId)
  const source = requireSource(ws, args.sourceId)
  const versionId = args.sourceVersionId ?? source.headVersionId
  const version = ws.sourceVersions[versionId]
  if (!version || version.sourceId !== source.id) throw new Error(`Unknown source version: ${versionId}`)
  if (!Number.isInteger(args.start) || !Number.isInteger(args.end)) throw new Error('Offsets must be integers')
  if (args.start < 0 || args.end > version.text.length || args.start > args.end) {
    throw new Error(`Span out of range: [${args.start}, ${args.end}) for text of length ${version.text.length}`)
  }
  if (args.start === args.end) throw new Error('Span is empty')
  const b = nextId(ws, 'bnd')
  const binding: Binding = {
    id: b.id,
    claimId: args.claimId,
    sourceId: source.id,
    sourceVersionId: versionId,
    start: args.start,
    end: args.end,
    excerpt: version.text.slice(args.start, args.end),
    createdAt: clock(),
  }
  let next: Workspace = { ...b.ws, bindings: { ...b.ws.bindings, [b.id]: binding } }
  next = pushEvent(next, { type: 'binding-added', bindingId: b.id, claimId: args.claimId, sourceVersionId: versionId }, clock)
  return { ws: next, bindingId: b.id }
}

export function removeBinding(ws: Workspace, bindingId: ID, clock: Clock = systemClock): Workspace {
  if (!ws.bindings[bindingId]) throw new Error(`Unknown binding: ${bindingId}`)
  const bindings = { ...ws.bindings }
  delete bindings[bindingId]
  return pushEvent({ ...ws, bindings }, { type: 'binding-removed', bindingId }, clock)
}

export function bindingsOf(ws: Workspace, claimId: ID): Binding[] {
  return sortedByCreation(Object.values(ws.bindings).filter((b) => b.claimId === claimId))
}

/**
 * Bindings that are current for review purposes: for each source, only the
 * bindings on the newest source version this claim is bound to. Older
 * bindings remain in the workspace as history (see `supersededBindingsOf`).
 */
export function activeBindingsOf(ws: Workspace, claimId: ID): Binding[] {
  const all = bindingsOf(ws, claimId)
  const newestPerSource = new Map<ID, number>()
  for (const b of all) {
    const vNo = ws.sourceVersions[b.sourceVersionId]?.versionNo ?? 0
    newestPerSource.set(b.sourceId, Math.max(newestPerSource.get(b.sourceId) ?? 0, vNo))
  }
  return all.filter((b) => (ws.sourceVersions[b.sourceVersionId]?.versionNo ?? 0) === newestPerSource.get(b.sourceId))
}

export function supersededBindingsOf(ws: Workspace, claimId: ID): Binding[] {
  const active = new Set(activeBindingsOf(ws, claimId).map((b) => b.id))
  return bindingsOf(ws, claimId).filter((b) => !active.has(b.id))
}

/**
 * Find an excerpt inside a (possibly newer) text. Returns the span if the
 * excerpt occurs exactly once; null otherwise. Used only as a suggestion.
 */
export function locateExcerpt(text: string, excerpt: string): { start: number; end: number } | null {
  if (!excerpt) return null
  const first = text.indexOf(excerpt)
  if (first < 0) return null
  const second = text.indexOf(excerpt, first + 1)
  if (second >= 0) return null
  return { start: first, end: first + excerpt.length }
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export function dependenciesOf(ws: Workspace, claimId: ID): Dependency[] {
  return sortedByCreation(Object.values(ws.dependencies).filter((d) => d.claimId === claimId))
}

export function dependentsOf(ws: Workspace, claimId: ID): Dependency[] {
  return sortedByCreation(Object.values(ws.dependencies).filter((d) => d.dependsOnClaimId === claimId))
}

function reaches(ws: Workspace, from: ID, target: ID, seen = new Set<ID>()): boolean {
  if (from === target) return true
  if (seen.has(from)) return false
  seen.add(from)
  for (const d of dependenciesOf(ws, from)) {
    if (reaches(ws, d.dependsOnClaimId, target, seen)) return true
  }
  return false
}

export function addDependency(
  ws: Workspace,
  args: { claimId: ID; dependsOnClaimId: ID; status: DependencyStatus; note?: string },
  clock: Clock = systemClock,
) {
  if (args.claimId === args.dependsOnClaimId) throw new Error('A claim cannot depend on itself')
  requireClaim(ws, args.claimId)
  requireClaim(ws, args.dependsOnClaimId)
  const dup = Object.values(ws.dependencies).find(
    (d) => d.claimId === args.claimId && d.dependsOnClaimId === args.dependsOnClaimId,
  )
  if (dup) throw new Error(`Dependency already exists (${dup.id}); confirm or remove it instead`)
  // Adding claimId -> dependsOnClaimId creates a cycle iff dependsOnClaimId already reaches claimId.
  if (reaches(ws, args.dependsOnClaimId, args.claimId)) throw new Error('Dependency would create a cycle')
  const d = nextId(ws, 'dep')
  const dep: Dependency = {
    id: d.id,
    claimId: args.claimId,
    dependsOnClaimId: args.dependsOnClaimId,
    status: args.status,
    ...(args.note ? { note: args.note } : {}),
    createdAt: clock(),
  }
  let next: Workspace = { ...d.ws, dependencies: { ...d.ws.dependencies, [d.id]: dep } }
  next = pushEvent(
    next,
    { type: 'dependency-added', dependencyId: d.id, claimId: dep.claimId, dependsOnClaimId: dep.dependsOnClaimId, status: dep.status },
    clock,
  )
  return { ws: next, dependencyId: d.id }
}

export function confirmDependency(ws: Workspace, dependencyId: ID, clock: Clock = systemClock): Workspace {
  const dep = ws.dependencies[dependencyId]
  if (!dep) throw new Error(`Unknown dependency: ${dependencyId}`)
  if (dep.status === 'confirmed') return ws
  const next: Workspace = { ...ws, dependencies: { ...ws.dependencies, [dep.id]: { ...dep, status: 'confirmed' } } }
  return pushEvent(next, { type: 'dependency-confirmed', dependencyId }, clock)
}

export function removeDependency(ws: Workspace, dependencyId: ID, clock: Clock = systemClock): Workspace {
  if (!ws.dependencies[dependencyId]) throw new Error(`Unknown dependency: ${dependencyId}`)
  const dependencies = { ...ws.dependencies }
  delete dependencies[dependencyId]
  return pushEvent({ ...ws, dependencies }, { type: 'dependency-removed', dependencyId }, clock)
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export function reviewsOf(ws: Workspace, claimId: ID): Review[] {
  return sortedByCreation(Object.values(ws.reviews).filter((r) => r.claimId === claimId))
}

export function latestReview(ws: Workspace, claimId: ID): Review | undefined {
  return reviewsOf(ws, claimId).at(-1)
}

export function addReview(
  ws: Workspace,
  args: { claimId: ID; label: ReviewLabel; rationale: string; reviewer?: string },
  clock: Clock = systemClock,
) {
  const claim = requireClaim(ws, args.claimId)
  const basisSources: ReviewBasisSource[] = activeBindingsOf(ws, claim.id).map((b) => ({
    sourceId: b.sourceId,
    sourceVersionId: b.sourceVersionId,
    bindingId: b.id,
  }))
  const basisClaims: ReviewBasisClaim[] = dependenciesOf(ws, claim.id)
    .filter((d) => d.status === 'confirmed')
    .map((d) => {
      const up = requireClaim(ws, d.dependsOnClaimId)
      return {
        claimId: up.id,
        claimVersionId: up.headVersionId,
        reviewId: latestReview(ws, up.id)?.id ?? null,
        dependencyId: d.id,
      }
    })
  const r = nextId(ws, 'rev')
  const review: Review = {
    id: r.id,
    claimId: claim.id,
    claimVersionId: claim.headVersionId,
    label: args.label,
    rationale: args.rationale,
    ...(args.reviewer ? { reviewer: args.reviewer } : {}),
    basisSources,
    basisClaims,
    createdAt: clock(),
  }
  let next: Workspace = { ...r.ws, reviews: { ...r.ws.reviews, [r.id]: review } }
  next = pushEvent(next, { type: 'review-added', reviewId: r.id, claimId: claim.id, claimVersionId: claim.headVersionId }, clock)
  return { ws: next, reviewId: r.id }
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

/**
 * Derive whether a claim's latest review still applies to the current state.
 * Never stored; recomputed from versions, bindings, dependencies and reviews.
 */
export function claimState(ws: Workspace, claimId: ID, memo: Map<ID, ReviewState> = new Map()): ReviewState {
  const cached = memo.get(claimId)
  if (cached) return cached
  const claim = requireClaim(ws, claimId)
  const review = latestReview(ws, claimId)
  if (!review) {
    const s: ReviewState = { kind: 'unreviewed' }
    memo.set(claimId, s)
    return s
  }
  const reasons: StaleReason[] = []

  if (review.claimVersionId !== claim.headVersionId) {
    reasons.push({ type: 'claim-edited', reviewedVersionId: review.claimVersionId, currentVersionId: claim.headVersionId })
  }

  for (const b of review.basisSources) {
    const source = ws.sources[b.sourceId]
    if (source && source.headVersionId !== b.sourceVersionId) {
      reasons.push({ type: 'source-changed', sourceId: b.sourceId, reviewedVersionId: b.sourceVersionId, currentVersionId: source.headVersionId })
    }
  }

  for (const b of bindingsOf(ws, claimId)) {
    if (idNumber(b.id) > idNumber(review.id)) reasons.push({ type: 'binding-added-after-review', bindingId: b.id })
  }

  const basisByDep = new Map(review.basisClaims.map((c) => [c.dependencyId, c]))
  for (const d of dependenciesOf(ws, claimId)) {
    if (d.status !== 'confirmed') continue
    const basis = basisByDep.get(d.id)
    if (!basis) {
      reasons.push({ type: 'dependency-added-after-review', dependencyId: d.id, dependsOnClaimId: d.dependsOnClaimId })
      continue
    }
    const upState = claimState(ws, d.dependsOnClaimId, memo)
    if (upState.kind === 'needs-re-review') {
      const upPath = upState.reasons.find((r): r is Extract<StaleReason, { type: 'upstream-needs-re-review' }> => r.type === 'upstream-needs-re-review')
      const path = upPath ? [...upPath.path, claimId] : [d.dependsOnClaimId, claimId]
      reasons.push({ type: 'upstream-needs-re-review', dependsOnClaimId: d.dependsOnClaimId, path })
      continue
    }
    const upLatest = latestReview(ws, d.dependsOnClaimId)
    if (upLatest && upLatest.id !== basis.reviewId) {
      reasons.push({ type: 'upstream-re-reviewed', dependsOnClaimId: d.dependsOnClaimId, reviewedReviewId: basis.reviewId, currentReviewId: upLatest.id })
    }
  }

  const state: ReviewState =
    reasons.length === 0
      ? { kind: 'current', reviewId: review.id, label: review.label }
      : { kind: 'needs-re-review', reviewId: review.id, label: review.label, reasons }
  memo.set(claimId, state)
  return state
}

export function allClaimStates(ws: Workspace): Map<ID, ReviewState> {
  const memo = new Map<ID, ReviewState>()
  for (const c of claimsInOrder(ws)) claimState(ws, c.id, memo)
  return memo
}

// ---------------------------------------------------------------------------
// Impact of a source revision
// ---------------------------------------------------------------------------

export function computeImpact(
  ws: Workspace,
  args: { sourceId: ID; fromVersionId: ID; toVersionId: ID },
): ImpactReport {
  requireSource(ws, args.sourceId)
  const direct = claimsInOrder(ws)
    .filter((c) => bindingsOf(ws, c.id).some((b) => b.sourceId === args.sourceId))
    .map((c) => c.id)

  const indirect: ImpactReport['indirect'] = []
  const potential: ImpactReport['potential'] = []
  const seenConfirmed = new Set<ID>(direct)
  const seenPotential = new Set<ID>()

  // Breadth-first over dependents. Path is the chain of claim ids from a direct claim.
  type Item = { claimId: ID; path: ID[]; viaUnconfirmed: ID[] }
  const queue: Item[] = direct.map((id) => ({ claimId: id, path: [id], viaUnconfirmed: [] }))
  while (queue.length) {
    const item = queue.shift()!
    for (const d of dependentsOf(ws, item.claimId)) {
      const viaUnconfirmed = d.status === 'confirmed' ? item.viaUnconfirmed : [...item.viaUnconfirmed, d.id]
      const path = [...item.path, d.claimId]
      if (viaUnconfirmed.length === 0) {
        if (seenConfirmed.has(d.claimId)) continue
        seenConfirmed.add(d.claimId)
        indirect.push({ claimId: d.claimId, path })
      } else {
        if (seenConfirmed.has(d.claimId) || seenPotential.has(d.claimId)) continue
        seenPotential.add(d.claimId)
        potential.push({ claimId: d.claimId, path, viaUnconfirmed })
      }
      queue.push({ claimId: d.claimId, path, viaUnconfirmed })
    }
  }
  // A claim reachable both ways counts as confirmed impact; drop it from potential.
  const potentialFinal = potential.filter((p) => !seenConfirmed.has(p.claimId))
  const affected = new Set<ID>([...seenConfirmed, ...potentialFinal.map((p) => p.claimId)])
  const unaffected = claimsInOrder(ws).map((c) => c.id).filter((id) => !affected.has(id))
  return { sourceId: args.sourceId, fromVersionId: args.fromVersionId, toVersionId: args.toVersionId, direct, indirect, potential: potentialFinal, unaffected }
}
