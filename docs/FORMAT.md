# Workspace JSON format (`eosi-workspace` 0.1)

The export is a single JSON object. The app reads only this format and version;
files with another `format` or `formatVersion` are refused with a message.
This format is specific to Inspector. It has not been verified against any
other schema and makes no compatibility claim beyond itself.

```jsonc
{
  "format": "eosi-workspace",
  "formatVersion": "0.1",
  "meta": { "title": "…", "synthetic": false, "description": "…" },
  "nextId": 42,
  "sources":        { "src_1": { "id": "src_1", "title": "…", "doi": "…", "url": "…",
                                 "identifierStatus": "none" | "user-provided-unverified",
                                 "headVersionId": "sv_2", "createdAt": "ISO-8601" } },
  "sourceVersions": { "sv_2": { "id": "sv_2", "sourceId": "src_1", "versionNo": 1,
                                "text": "…", "contentHash": "<sha256 hex>", "createdAt": "…", "note": "…" } },
  "claims":         { "clm_3": { "id": "clm_3", "label": "C1", "headVersionId": "cv_4",
                                 "createdAt": "…", "order": 0 } },
  "claimVersions":  { "cv_4": { "id": "cv_4", "claimId": "clm_3", "versionNo": 1,
                                "text": "…", "contentHash": "<sha256 hex>", "createdAt": "…" } },
  "bindings":       { "bnd_5": { "id": "bnd_5", "claimId": "clm_3", "sourceId": "src_1",
                                 "sourceVersionId": "sv_2", "start": 12, "end": 80,
                                 "excerpt": "…", "createdAt": "…" } },
  "reviews":        { "rev_6": { "id": "rev_6", "claimId": "clm_3", "claimVersionId": "cv_4",
                                 "label": "supported-in-scope", "rationale": "…", "reviewer": "…",
                                 "basisSources": [ { "sourceId": "src_1", "sourceVersionId": "sv_2", "bindingId": "bnd_5" } ],
                                 "basisClaims":  [ { "claimId": "clm_7", "claimVersionId": "cv_8",
                                                     "reviewId": "rev_9" | null, "dependencyId": "dep_10" } ],
                                 "createdAt": "…" } },
  "dependencies":   { "dep_10": { "id": "dep_10", "claimId": "clm_3", "dependsOnClaimId": "clm_7",
                                  "status": "confirmed" | "unconfirmed", "note": "…", "createdAt": "…" } },
  "history":        [ { "id": "ev_11", "at": "…", "type": "source-revised",
                        "sourceId": "src_1", "fromVersionId": "sv_1", "toVersionId": "sv_2" } ]
}
```

## Rules checked on import

- `format` and `formatVersion` must match exactly.
- Every record key equals its `id`; ids match `^[a-z]+_\d+$`.
- Field types as above. Optional fields: `meta.description`, source `doi`/`url`, source-version `note`, claim `label`, review `reviewer`, dependency `note`. Unknown fields are dropped from records; history events keep only the fields defined for their `type` (see below), and an event with a missing field or an id outside the pattern is rejected.
- Review `label` must be one of `supported-in-scope`, `partially-supported`, `not-supported`, `cannot-determine`.
- `contentHash` must equal SHA-256 of `text` (UTF-8, lower-case hex).
- Head versions must exist and belong to their owner.
- Bindings must reference an existing claim and a version of the stated source;
  `0 <= start < end <= text.length`; `excerpt` equals `text.slice(start, end)`.
- Reviews must reference existing claim versions, sources, source versions and
  upstream reviews.
- Dependencies: no self-edges, no duplicate edges, no cycles.
- `nextId` is raised if any id suffix is larger, so new ids cannot collide.

## History event fields

| type | fields |
|---|---|
| workspace-created | – |
| source-added | sourceId, versionId |
| source-revised | sourceId, fromVersionId, toVersionId |
| source-renamed | sourceId, from, to |
| claim-added | claimId, versionId |
| claim-edited | claimId, fromVersionId, toVersionId |
| binding-added | bindingId, claimId, sourceVersionId |
| binding-removed | bindingId |
| review-added | reviewId, claimId, claimVersionId |
| dependency-added | dependencyId, claimId, dependsOnClaimId, status |
| dependency-confirmed / dependency-removed | dependencyId |
| note | text |

## Character offsets

Offsets count UTF-16 code units, the same units JavaScript's `String.length`
and `slice` use. Astral characters (for example many emoji) count as two.

## Stability

Format 0.1 may change before 1.0. When it does, the version string changes and
the app will state that it cannot read the older file rather than reading it
partially. A migration path will be documented in this file.
