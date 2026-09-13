import { sha256Hex } from './hash'
import {
  WORKSPACE_FORMAT,
  WORKSPACE_FORMAT_VERSION,
  type Binding,
  type Claim,
  type ClaimVersion,
  type Dependency,
  type HistoryEvent,
  type ID,
  type Review,
  type Source,
  type SourceVersion,
  type Workspace,
} from './types'

export type ImportResult = { ok: true; ws: Workspace; warnings: string[] } | { ok: false; errors: string[] }

export function exportWorkspace(ws: Workspace): string {
  const ordered: Workspace = {
    format: ws.format,
    formatVersion: ws.formatVersion,
    meta: ws.meta,
    nextId: ws.nextId,
    sources: ws.sources,
    sourceVersions: ws.sourceVersions,
    claims: ws.claims,
    claimVersions: ws.claimVersions,
    bindings: ws.bindings,
    reviews: ws.reviews,
    dependencies: ws.dependencies,
    history: ws.history,
  }
  return JSON.stringify(ordered, null, 2) + '\n'
}

// ---------------------------------------------------------------------------
// Validation helpers. Everything read from a file is untrusted input.
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isOptStr = (v: unknown): v is string | undefined => v === undefined || typeof v === 'string'
const isInt = (v: unknown): v is number => Number.isInteger(v)
const ID_RE = /^[a-z]+_\d+$/
// Id numbers are bounded well below Number.MAX_SAFE_INTEGER so that nextId + 1
// stays exact. Without this, an id like ev_99999999999999999999 imports fine and
// every new object afterwards receives the same id, silently overwriting data.
export const MAX_ID_NUMBER = 2 ** 48
const idNumberOf = (id: string) => Number(id.slice(id.lastIndexOf('_') + 1))
const isValidId = (id: unknown): id is string => isStr(id) && ID_RE.test(id) && idNumberOf(id) <= MAX_ID_NUMBER

// 'unreviewed' is the derived state of a claim with no review; it is never a stored review label.
const REVIEW_LABELS = new Set(['supported-in-scope', 'partially-supported', 'not-supported', 'cannot-determine'])
const DEP_STATUS = new Set(['confirmed', 'unconfirmed'])
// Exact field whitelist per history event type (all string-valued). Anything else is dropped;
// a missing required field rejects the event.
const EVENT_FIELDS: Record<string, string[]> = {
  'workspace-created': [],
  'source-added': ['sourceId', 'versionId'],
  'source-revised': ['sourceId', 'fromVersionId', 'toVersionId'],
  'source-renamed': ['sourceId', 'from', 'to'],
  'claim-added': ['claimId', 'versionId'],
  'claim-edited': ['claimId', 'fromVersionId', 'toVersionId'],
  'binding-added': ['bindingId', 'claimId', 'sourceVersionId'],
  'binding-removed': ['bindingId'],
  'review-added': ['reviewId', 'claimId', 'claimVersionId'],
  'dependency-added': ['dependencyId', 'claimId', 'dependsOnClaimId', 'status'],
  'dependency-confirmed': ['dependencyId'],
  'dependency-removed': ['dependencyId'],
  note: ['text'],
}

class Validator {
  errors: string[] = []
  warnings: string[] = []
  fail(msg: string) {
    this.errors.push(msg)
  }
}

function readRecord<T>(v: Validator, raw: unknown, name: string, parse: (id: ID, o: Obj) => T | null): Record<ID, T> {
  const out: Record<ID, T> = {}
  if (raw === undefined) return out
  if (!isObj(raw)) {
    v.fail(`${name} must be an object`)
    return out
  }
  for (const [key, val] of Object.entries(raw)) {
    if (!isValidId(key)) {
      v.fail(`${name}: invalid id "${key}"`)
      continue
    }
    if (!isObj(val) || val.id !== key) {
      v.fail(`${name}.${key}: entry must be an object whose id matches its key`)
      continue
    }
    const parsed = parse(key, val)
    if (parsed) out[key] = parsed
  }
  return out
}

export function importWorkspace(json: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${(e as Error).message}`] }
  }
  if (!isObj(raw)) return { ok: false, errors: ['Top level must be an object'] }
  if (raw.format !== WORKSPACE_FORMAT) return { ok: false, errors: [`Unknown format "${String(raw.format)}"; expected "${WORKSPACE_FORMAT}"`] }
  if (raw.formatVersion !== WORKSPACE_FORMAT_VERSION) {
    return { ok: false, errors: [`Unsupported format version "${String(raw.formatVersion)}"; this build reads ${WORKSPACE_FORMAT_VERSION}`] }
  }
  const v = new Validator()

  const metaRaw = raw.meta
  if (!isObj(metaRaw) || !isStr(metaRaw.title) || typeof metaRaw.synthetic !== 'boolean' || !isOptStr(metaRaw.description)) {
    v.fail('meta must have title (string), synthetic (boolean) and optional description')
  }
  const meta = isObj(metaRaw)
    ? { title: String(metaRaw.title ?? ''), synthetic: metaRaw.synthetic === true, ...(isStr(metaRaw.description) ? { description: metaRaw.description } : {}) }
    : { title: '', synthetic: false }

  let nextId = 1
  if (isInt(raw.nextId) && raw.nextId >= 1 && raw.nextId <= MAX_ID_NUMBER + 1) nextId = raw.nextId
  else v.fail(`nextId must be a positive integer no larger than ${MAX_ID_NUMBER + 1}`)

  const sourceVersions = readRecord<SourceVersion>(v, raw.sourceVersions, 'sourceVersions', (id, o) => {
    if (!isStr(o.sourceId) || !isInt(o.versionNo) || !isStr(o.text) || !isStr(o.contentHash) || !isStr(o.createdAt) || !isOptStr(o.note)) {
      v.fail(`sourceVersions.${id}: wrong field types`)
      return null
    }
    if (sha256Hex(o.text) !== o.contentHash) {
      v.fail(`sourceVersions.${id}: content hash does not match text`)
      return null
    }
    return { id, sourceId: o.sourceId, versionNo: o.versionNo, text: o.text, contentHash: o.contentHash, createdAt: o.createdAt, ...(isStr(o.note) ? { note: o.note } : {}) }
  })

  const sources = readRecord<Source>(v, raw.sources, 'sources', (id, o) => {
    if (!isStr(o.title) || !isOptStr(o.doi) || !isOptStr(o.url) || !isStr(o.headVersionId) || !isStr(o.createdAt)) {
      v.fail(`sources.${id}: wrong field types`)
      return null
    }
    if (o.identifierStatus !== 'none' && o.identifierStatus !== 'user-provided-unverified') {
      v.fail(`sources.${id}: invalid identifierStatus`)
      return null
    }
    return {
      id, title: o.title, ...(isStr(o.doi) ? { doi: o.doi } : {}), ...(isStr(o.url) ? { url: o.url } : {}),
      identifierStatus: o.identifierStatus, headVersionId: o.headVersionId, createdAt: o.createdAt,
    }
  })

  const claimVersions = readRecord<ClaimVersion>(v, raw.claimVersions, 'claimVersions', (id, o) => {
    if (!isStr(o.claimId) || !isInt(o.versionNo) || !isStr(o.text) || !isStr(o.contentHash) || !isStr(o.createdAt)) {
      v.fail(`claimVersions.${id}: wrong field types`)
      return null
    }
    if (sha256Hex(o.text) !== o.contentHash) {
      v.fail(`claimVersions.${id}: content hash does not match text`)
      return null
    }
    return { id, claimId: o.claimId, versionNo: o.versionNo, text: o.text, contentHash: o.contentHash, createdAt: o.createdAt }
  })

  const claims = readRecord<Claim>(v, raw.claims, 'claims', (id, o) => {
    if (!isOptStr(o.label) || !isStr(o.headVersionId) || !isStr(o.createdAt) || !isInt(o.order)) {
      v.fail(`claims.${id}: wrong field types`)
      return null
    }
    return { id, ...(isStr(o.label) ? { label: o.label } : {}), headVersionId: o.headVersionId, createdAt: o.createdAt, order: o.order }
  })

  const bindings = readRecord<Binding>(v, raw.bindings, 'bindings', (id, o) => {
    if (!isStr(o.claimId) || !isStr(o.sourceId) || !isStr(o.sourceVersionId) || !isInt(o.start) || !isInt(o.end) || !isStr(o.excerpt) || !isStr(o.createdAt)) {
      v.fail(`bindings.${id}: wrong field types`)
      return null
    }
    return { id, claimId: o.claimId, sourceId: o.sourceId, sourceVersionId: o.sourceVersionId, start: o.start, end: o.end, excerpt: o.excerpt, createdAt: o.createdAt }
  })

  const reviews = readRecord<Review>(v, raw.reviews, 'reviews', (id, o) => {
    if (isStr(o.label) && !REVIEW_LABELS.has(o.label)) {
      v.fail(`reviews.${id}: label "${o.label}" is not one of ${[...REVIEW_LABELS].join(', ')}`)
      return null
    }
    if (!isStr(o.claimId) || !isStr(o.claimVersionId) || !isStr(o.label) || !isStr(o.rationale) || !isOptStr(o.reviewer) || !isStr(o.createdAt)) {
      v.fail(`reviews.${id}: wrong field types`)
      return null
    }
    if (!Array.isArray(o.basisSources) || !Array.isArray(o.basisClaims)) {
      v.fail(`reviews.${id}: basis arrays missing`)
      return null
    }
    const basisSources = []
    for (const b of o.basisSources) {
      if (!isObj(b) || !isStr(b.sourceId) || !isStr(b.sourceVersionId) || !isStr(b.bindingId)) {
        v.fail(`reviews.${id}: invalid basisSources entry`)
        return null
      }
      basisSources.push({ sourceId: b.sourceId, sourceVersionId: b.sourceVersionId, bindingId: b.bindingId })
    }
    const basisClaims = []
    for (const b of o.basisClaims) {
      if (!isObj(b) || !isStr(b.claimId) || !isStr(b.claimVersionId) || !(b.reviewId === null || isStr(b.reviewId)) || !isStr(b.dependencyId)) {
        v.fail(`reviews.${id}: invalid basisClaims entry`)
        return null
      }
      basisClaims.push({ claimId: b.claimId, claimVersionId: b.claimVersionId, reviewId: b.reviewId as string | null, dependencyId: b.dependencyId })
    }
    return {
      id, claimId: o.claimId, claimVersionId: o.claimVersionId, label: o.label as Review['label'], rationale: o.rationale,
      ...(isStr(o.reviewer) ? { reviewer: o.reviewer } : {}), basisSources, basisClaims, createdAt: o.createdAt,
    }
  })

  const dependencies = readRecord<Dependency>(v, raw.dependencies, 'dependencies', (id, o) => {
    if (!isStr(o.claimId) || !isStr(o.dependsOnClaimId) || !isStr(o.status) || !DEP_STATUS.has(o.status) || !isOptStr(o.note) || !isStr(o.createdAt)) {
      v.fail(`dependencies.${id}: wrong field types`)
      return null
    }
    return { id, claimId: o.claimId, dependsOnClaimId: o.dependsOnClaimId, status: o.status as Dependency['status'], ...(isStr(o.note) ? { note: o.note } : {}), createdAt: o.createdAt }
  })

  const history: HistoryEvent[] = []
  if (!Array.isArray(raw.history)) v.fail('history must be an array')
  else {
    raw.history.forEach((ev: unknown, idx: number) => {
      // Object.hasOwn, not `in`: inherited names such as "constructor" must not count as known types.
      if (!isObj(ev) || !isValidId(ev.id) || !isStr(ev.at) || !isStr(ev.type) || !Object.hasOwn(EVENT_FIELDS, ev.type)) {
        v.fail(`history[${idx}]: invalid event (id, at and a known type are required; ids match ${ID_RE} with a number up to ${MAX_ID_NUMBER})`)
        return
      }
      const clean: Obj = { id: ev.id, at: ev.at, type: ev.type }
      for (const field of EVENT_FIELDS[ev.type]) {
        const val = ev[field]
        if (!isStr(val)) {
          v.fail(`history[${idx}] (${ev.id}): ${ev.type} requires string field "${field}"`)
          return
        }
        clean[field] = val
      }
      if (ev.type === 'dependency-added' && !DEP_STATUS.has(clean.status as string)) {
        v.fail(`history[${idx}] (${ev.id}): invalid dependency status`)
        return
      }
      history.push(clean as unknown as HistoryEvent)
    })
  }

  if (v.errors.length) return { ok: false, errors: v.errors }

  // References must resolve to records read from this file, never to inherited
  // names such as "constructor" or "__proto__".
  const own = (rec: object, id: string) => Object.hasOwn(rec, id)
  const get = <T,>(rec: Record<ID, T>, id: string): T | undefined => (Object.hasOwn(rec, id) ? rec[id] : undefined)
  const seenEventIds = new Set<string>()
  for (const h of history) {
    if (seenEventIds.has(h.id)) v.fail(`history: duplicate event id ${h.id}`)
    seenEventIds.add(h.id)
  }

  // Referential integrity
  for (const sv of Object.values(sourceVersions)) if (!own(sources, sv.sourceId)) v.fail(`sourceVersions.${sv.id}: unknown source ${sv.sourceId}`)
  for (const s of Object.values(sources)) {
    const head = get(sourceVersions, s.headVersionId)
    if (!head || head.sourceId !== s.id) v.fail(`sources.${s.id}: head version ${s.headVersionId} missing or belongs to another source`)
  }
  for (const cv of Object.values(claimVersions)) if (!own(claims, cv.claimId)) v.fail(`claimVersions.${cv.id}: unknown claim ${cv.claimId}`)
  for (const c of Object.values(claims)) {
    const head = get(claimVersions, c.headVersionId)
    if (!head || head.claimId !== c.id) v.fail(`claims.${c.id}: head version ${c.headVersionId} missing or belongs to another claim`)
  }
  for (const b of Object.values(bindings)) {
    if (!own(claims, b.claimId)) v.fail(`bindings.${b.id}: unknown claim ${b.claimId}`)
    const sv = get(sourceVersions, b.sourceVersionId)
    if (!sv || sv.sourceId !== b.sourceId) v.fail(`bindings.${b.id}: source version ${b.sourceVersionId} missing or not of source ${b.sourceId}`)
    else if (b.start < 0 || b.end > sv.text.length || b.start >= b.end) v.fail(`bindings.${b.id}: span out of range`)
    else if (sv.text.slice(b.start, b.end) !== b.excerpt) v.fail(`bindings.${b.id}: excerpt does not match the span`)
  }
  for (const r of Object.values(reviews)) {
    if (!own(claims, r.claimId)) v.fail(`reviews.${r.id}: unknown claim ${r.claimId}`)
    const cv = get(claimVersions, r.claimVersionId)
    if (!cv || cv.claimId !== r.claimId) v.fail(`reviews.${r.id}: claim version ${r.claimVersionId} missing or of another claim`)
    for (const b of r.basisSources) {
      if (!own(sources, b.sourceId)) v.fail(`reviews.${r.id}: unknown source ${b.sourceId}`)
      if (!own(sourceVersions, b.sourceVersionId)) v.fail(`reviews.${r.id}: unknown source version ${b.sourceVersionId}`)
      if (!own(bindings, b.bindingId)) v.warnings.push(`reviews.${r.id}: basis binding ${b.bindingId} no longer exists`)
    }
    for (const b of r.basisClaims) {
      if (!own(claims, b.claimId)) v.fail(`reviews.${r.id}: unknown upstream claim ${b.claimId}`)
      if (!own(claimVersions, b.claimVersionId)) v.fail(`reviews.${r.id}: unknown upstream claim version ${b.claimVersionId}`)
      if (b.reviewId !== null && !own(reviews, b.reviewId)) v.fail(`reviews.${r.id}: unknown upstream review ${b.reviewId}`)
      if (!own(dependencies, b.dependencyId)) v.warnings.push(`reviews.${r.id}: basis dependency ${b.dependencyId} no longer exists`)
    }
  }
  const seenEdges = new Set<string>()
  for (const d of Object.values(dependencies)) {
    if (!own(claims, d.claimId)) v.fail(`dependencies.${d.id}: unknown claim ${d.claimId}`)
    if (!own(claims, d.dependsOnClaimId)) v.fail(`dependencies.${d.id}: unknown claim ${d.dependsOnClaimId}`)
    if (d.claimId === d.dependsOnClaimId) v.fail(`dependencies.${d.id}: self-dependency`)
    const key = `${d.claimId}->${d.dependsOnClaimId}`
    if (seenEdges.has(key)) v.fail(`dependencies.${d.id}: duplicate edge ${key}`)
    seenEdges.add(key)
  }
  if (v.errors.length) return { ok: false, errors: v.errors }

  // Cycle detection over all edges (confirmed or not).
  const adj = new Map<ID, ID[]>()
  for (const d of Object.values(dependencies)) adj.set(d.claimId, [...(adj.get(d.claimId) ?? []), d.dependsOnClaimId])
  const color = new Map<ID, 1 | 2>()
  const visit = (n: ID): boolean => {
    const c = color.get(n)
    if (c === 1) return true
    if (c === 2) return false
    color.set(n, 1)
    for (const m of adj.get(n) ?? []) if (visit(m)) return true
    color.set(n, 2)
    return false
  }
  for (const c of Object.keys(claims)) {
    if (visit(c)) {
      v.fail('dependencies: cycle detected')
      break
    }
  }
  if (v.errors.length) return { ok: false, errors: v.errors }

  // nextId must exceed every numeric id suffix, otherwise new ids could collide.
  let maxId = 0
  const bump = (id: ID) => {
    const n = Number(id.slice(id.lastIndexOf('_') + 1))
    if (Number.isFinite(n)) maxId = Math.max(maxId, n)
  }
  for (const rec of [sources, sourceVersions, claims, claimVersions, bindings, reviews, dependencies]) Object.keys(rec).forEach(bump)
  history.forEach((h) => bump(h.id))
  const safeNextId = Math.max(nextId, maxId + 1)
  if (safeNextId !== nextId) v.warnings.push(`nextId raised from ${nextId} to ${safeNextId}`)

  const ws: Workspace = {
    format: WORKSPACE_FORMAT,
    formatVersion: WORKSPACE_FORMAT_VERSION,
    meta,
    nextId: safeNextId,
    sources: { ...sources },
    sourceVersions: { ...sourceVersions },
    claims: { ...claims },
    claimVersions: { ...claimVersions },
    bindings: { ...bindings },
    reviews: { ...reviews },
    dependencies: { ...dependencies },
    history,
  }
  return { ok: true, ws, warnings: v.warnings }
}
