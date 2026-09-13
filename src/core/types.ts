/**
 * Evidence OS Inspector workspace model (format `eosi-workspace`, version 0.1).
 *
 * Design rules (see docs/CONCEPTS.md):
 * - Source text and claim text are versioned and immutable. Editing creates a new version.
 * - Bindings point at a specific source version and a character span inside it.
 * - Reviews are recorded against a specific claim version and snapshot the exact
 *   source versions / upstream claim reviews they were based on.
 * - Dependencies between claims are explicit and either `confirmed` or `unconfirmed`.
 *   Only confirmed dependencies propagate "needs re-review".
 */

export type ID = string

export const WORKSPACE_FORMAT = 'eosi-workspace' as const
export const WORKSPACE_FORMAT_VERSION = '0.1' as const

export interface SourceVersion {
  id: ID
  sourceId: ID
  versionNo: number
  text: string
  /** SHA-256 of `text` (UTF-8). Shows whether recorded content changed; nothing more. */
  contentHash: string
  createdAt: string
  note?: string
}

export interface Source {
  id: ID
  title: string
  /** Optional identifier supplied by the user. Never verified online by this tool. */
  doi?: string
  url?: string
  identifierStatus: 'none' | 'user-provided-unverified'
  headVersionId: ID
  createdAt: string
}

export interface ClaimVersion {
  id: ID
  claimId: ID
  versionNo: number
  text: string
  contentHash: string
  createdAt: string
}

export interface Claim {
  id: ID
  /** Display label; changing it is not a content change. */
  label?: string
  headVersionId: ID
  createdAt: string
  order: number
}

export interface Binding {
  id: ID
  claimId: ID
  sourceId: ID
  sourceVersionId: ID
  /** Character offsets (UTF-16 code units) inside the source version text. */
  start: number
  end: number
  excerpt: string
  createdAt: string
}

export type ReviewLabel =
  | 'unreviewed'
  | 'supported-in-scope'
  | 'partially-supported'
  | 'not-supported'
  | 'cannot-determine'

export interface ReviewBasisSource {
  sourceId: ID
  sourceVersionId: ID
  bindingId: ID
}

export interface ReviewBasisClaim {
  claimId: ID
  claimVersionId: ID
  /** Latest review of the upstream claim at the time, if any. */
  reviewId: ID | null
  dependencyId: ID
}

export interface Review {
  id: ID
  claimId: ID
  claimVersionId: ID
  label: ReviewLabel
  rationale: string
  reviewer?: string
  basisSources: ReviewBasisSource[]
  basisClaims: ReviewBasisClaim[]
  createdAt: string
}

export type DependencyStatus = 'confirmed' | 'unconfirmed'

export interface Dependency {
  id: ID
  /** The dependent claim. */
  claimId: ID
  /** The claim it depends on. */
  dependsOnClaimId: ID
  status: DependencyStatus
  note?: string
  createdAt: string
}

export type HistoryEvent =
  | { id: ID; at: string; type: 'workspace-created' }
  | { id: ID; at: string; type: 'source-added'; sourceId: ID; versionId: ID }
  | { id: ID; at: string; type: 'source-revised'; sourceId: ID; fromVersionId: ID; toVersionId: ID }
  | { id: ID; at: string; type: 'source-renamed'; sourceId: ID; from: string; to: string }
  | { id: ID; at: string; type: 'claim-added'; claimId: ID; versionId: ID }
  | { id: ID; at: string; type: 'claim-edited'; claimId: ID; fromVersionId: ID; toVersionId: ID }
  | { id: ID; at: string; type: 'binding-added'; bindingId: ID; claimId: ID; sourceVersionId: ID }
  | { id: ID; at: string; type: 'binding-removed'; bindingId: ID }
  | { id: ID; at: string; type: 'review-added'; reviewId: ID; claimId: ID; claimVersionId: ID }
  | { id: ID; at: string; type: 'dependency-added'; dependencyId: ID; claimId: ID; dependsOnClaimId: ID; status: DependencyStatus }
  | { id: ID; at: string; type: 'dependency-confirmed'; dependencyId: ID }
  | { id: ID; at: string; type: 'dependency-removed'; dependencyId: ID }
  | { id: ID; at: string; type: 'note'; text: string }

export interface WorkspaceMeta {
  title: string
  /** True for the bundled synthetic demos; shown prominently in UI and reports. */
  synthetic: boolean
  description?: string
}

export interface Workspace {
  format: typeof WORKSPACE_FORMAT
  formatVersion: typeof WORKSPACE_FORMAT_VERSION
  meta: WorkspaceMeta
  nextId: number
  sources: Record<ID, Source>
  sourceVersions: Record<ID, SourceVersion>
  claims: Record<ID, Claim>
  claimVersions: Record<ID, ClaimVersion>
  bindings: Record<ID, Binding>
  reviews: Record<ID, Review>
  dependencies: Record<ID, Dependency>
  history: HistoryEvent[]
}

/** Derived, never stored. */
export type ReviewState =
  | { kind: 'unreviewed' }
  | { kind: 'current'; reviewId: ID; label: ReviewLabel }
  | {
      kind: 'needs-re-review'
      reviewId: ID
      label: ReviewLabel
      reasons: StaleReason[]
    }

export type StaleReason =
  | { type: 'claim-edited'; reviewedVersionId: ID; currentVersionId: ID }
  | { type: 'source-changed'; sourceId: ID; reviewedVersionId: ID; currentVersionId: ID }
  | { type: 'binding-added-after-review'; bindingId: ID }
  | { type: 'dependency-added-after-review'; dependencyId: ID; dependsOnClaimId: ID }
  | { type: 'upstream-needs-re-review'; dependsOnClaimId: ID; path: ID[] }
  | { type: 'upstream-re-reviewed'; dependsOnClaimId: ID; reviewedReviewId: ID | null; currentReviewId: ID }

export interface ImpactReport {
  sourceId: ID
  fromVersionId: ID
  toVersionId: ID
  /** Claims bound to any version of the source. */
  direct: ID[]
  /** Claims reached through confirmed dependencies; path from a direct claim to the affected claim. */
  indirect: { claimId: ID; path: ID[] }[]
  /** Claims reached only through at least one unconfirmed dependency. Advisory only. */
  potential: { claimId: ID; path: ID[]; viaUnconfirmed: ID[] }[]
  /** Everything else. */
  unaffected: ID[]
}
