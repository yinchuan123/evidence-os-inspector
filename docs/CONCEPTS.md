# Concepts

This page defines the objects Inspector stores and the rules it applies. The
implementation is in `src/core/`; the unit tests in the same folder are the
executable form of these rules.

## Objects

| Object | Identity | Mutable fields | Immutable fields |
|---|---|---|---|
| Source | `src_N` | title, doi, url | creation time |
| Source version | `sv_N` | none | text, SHA-256 content hash, version number, note |
| Claim | `clm_N` | label (display only), order | creation time |
| Claim version | `cv_N` | none | text, content hash, version number |
| Binding | `bnd_N` | none (can be removed) | claim, source **version**, start, end, excerpt |
| Review | `rev_N` | none | claim **version**, label, rationale, reviewer, basis snapshot |
| Dependency | `dep_N` | status (unconfirmed → confirmed) | claim, depends-on claim |
| History event | `ev_N` | none | type, time, references |

Ids are sequential; the numeric suffix also gives creation order.

## Versioning

- Editing source text or claim text creates a new version and moves the
  "head" pointer. Identical text is a no-op.
- Renaming a source or relabelling a claim changes a display field only.
  It creates no version and triggers nothing.
- The content hash is SHA-256 over the UTF-8 text. Equal hash means equal
  recorded text. Nothing else.

## Bindings

- A binding records a character span `[start, end)` (UTF-16 code units, as
  JavaScript strings index them) inside one specific source version, plus the
  excerpt text at the time of binding. Import re-checks that the excerpt still
  equals the slice.
- Plain text has no pages, so no page numbers are stored or invented.
- When a source has a newer version, bindings on the older version are
  **superseded** for that source. The review pane can search for the old
  excerpt in the new version and offer to re-bind at the found position; it
  does so only when the excerpt occurs exactly once, and only on your click.

## Reviews

A review is anchored to the claim version it was made on and snapshots its
basis:

- `basisSources`: for each source with an active binding, the source version
  and binding used;
- `basisClaims`: for each **confirmed** dependency, the upstream claim version
  and the id of the upstream claim's latest review at that time (or `null`).

Labels: `supported-in-scope`, `partially-supported`, `not-supported`,
`cannot-determine`. `cannot-determine` is the intended label when the material
needed to judge is missing.

## Derived state

State is never stored; it is recomputed from the objects above.

```
unreviewed          no review exists for the claim
current             the latest review's basis matches the present state
needs-re-review     at least one reason below applies
```

Reasons, in the order they are checked:

1. `claim-edited`: claim head version differs from the reviewed version.
2. `source-changed`: a basis source's head version differs from the reviewed one.
3. `binding-added-after-review`: a binding was created after the latest review.
4. `dependency-added-after-review`: a confirmed dependency has no entry in the
   review's basis (it was added or confirmed later).
5. `upstream-needs-re-review`: a confirmed upstream claim is itself in
   `needs-re-review`; the reason carries the path of claim ids.
6. `upstream-re-reviewed`: the upstream claim's latest review id differs from
   the one recorded in the basis.

Only confirmed dependencies take part in 4–6. Unconfirmed dependencies never
change a claim's state.

## Impact of a source revision

`computeImpact(source, from, to)` returns:

- `direct`: claims with any binding to the source;
- `indirect`: claims reachable from direct claims by following confirmed
  dependency edges, each with the path;
- `potential`: claims reachable only through at least one unconfirmed edge;
- `unaffected`: all other claims.

The list is computed by breadth-first search over the recorded graph. Nothing
in the demos is hard-coded.

## Dependencies

- A claim cannot depend on itself.
- Both ends must exist.
- Adding an edge that would create a cycle (through any status) is refused.
- Duplicate edges are refused; confirm or remove the existing one instead.

## Import safety

The JSON importer validates the format id and version, field types, id
patterns, referential integrity, hashes, spans, duplicate edges and cycles. It
copies only known fields and ignores everything else, so a crafted file cannot
smuggle extra data into the workspace. Text from files is rendered as text;
links are emitted only for `http`/`https` URLs and well-formed DOIs.
