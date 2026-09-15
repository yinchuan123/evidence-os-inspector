# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Docs only; no code changes.

### Docs
- Positioning: Inspector is a small browser-only tool for demonstration,
  teaching and feedback, not a production tool for systematic-review teams.
- README (English and Chinese): "Who it is for", with what it does not suit
  today and a short note on why the problem matters, and "Related tools".
- A classroom exercise in docs/TEACHING.md, linked from the README.
- FAQ: "Who is this for?" and "Are there similar tools?" in both languages.
- Roadmap: the next phase is teaching and demonstration (Chinese demo texts,
  the classroom exercise, small usability fixes). Automatic detection of
  retractions, corrections or new versions, binding to numbers in extraction
  tables, and import from reference managers or review platforms are listed as
  not planned for v0.x.
- Roadmap: removed the earlier "fit into existing workflows" phase (`.docx` text
  extraction, a way for an AI writing assistant to propose bindings, and
  reference-export metadata).

## [0.1.0-alpha.4] - 2026-09-14

Point release from a final independent review of the live alpha.3 (import stress
tests with about 175 crafted files, edge cases of the alpha.3 fixes, a
first-time-visitor walkthrough in English and Chinese, docs versus release). No
high-severity problems were found; 31 findings stood after adversarial
verification. 29 are fixed here; 2 are recorded as issues for real-use feedback.

### Fixed: keeping your work
- When the browser refused to save a large workspace, the failure was silent and
  a refresh brought back an older workspace. A visible warning now asks you to
  export, the stale copy is removed, and the stored copy uses compact JSON.
- An unreadable saved workspace was silently replaced. It is now kept aside in
  session storage (`eosi.workspace.unreadable`) and a notice says so.
- Importing a file replaced your own workspace without asking. It now asks first
  (unless the file is the same workspace), naming what would be replaced.
- The app refused its own exports above 5 MB; the import limit is now 50 MB.
- A half-written review was lost when switching claims or tabs; drafts are now
  kept per claim.
- An imported file whose ids sat near the id limit became unimportable after one
  edit. Implausibly large ids are now renumbered compactly on import, keeping
  order and every reference. Ids named only in a review basis are no longer
  reused, and a review basis must belong to its claim and source version.
- A new claim is always added after the last one, even when imported order
  values have gaps.

### Fixed: interface and report
- Between 901 and about 1,020px the header pushed buttons off-screen; it now
  wraps below 1,200px.
- "Split into sentences" selects the first new claim, so the first binding goes
  where you expect.
- Recording a review shows a confirmation; the heading reads "Record review for
  claim v1".
- The binding counter distinguishes the current source version from older ones;
  the "passage not found" hint is no longer clipped.
- Local times carry their UTC offset; report times are labelled UTC.
- The language chosen on the start page now names a new workspace correctly.
- The HTML report shows the passages earlier reviews were based on, wraps tables
  for phones, and the Chinese report says "最新审阅" (latest review) instead of
  "当前有效审阅" (currently valid review).

### Docs
- README walkthrough: how to bind a passage, how to get back to "Review your
  text", and where the highlight is on a phone.
- FAQ: when an indirect claim is marked for re-review (it depends on the state of
  the claim it rests on).
- alpha.3 notes: references in records and review bases are checked; history
  events are display-only. CHANGELOG intro corrected (all eleven fixes held).

### Tests
- 89 unit tests (10 new) and 34 end-to-end flows (12 new). Every new test was
  checked by re-introducing its defect: 20 distinct defects, all caught.
  (The entry in the v0.1.0-alpha.4 tag says 33 flows and 19 defects; the last
  test was added after the entry was written. Corrected here.)

### Not fixed (tracked as issues)
- Very large workspaces (thousands of claims) become slow.
- A claim labelled "1" and an unlabelled claim in position 1 share a name.

## [0.1.0-alpha.3] - 2026-09-14

Point release from the post-release verification of alpha.2 on the live site
(two independent checkers per earlier finding). All eleven earlier fixes held;
the checkers and a regression sweep found further defects, fixed here.

### Fixed
- Import accepted id numbers beyond the exact-integer range (for example
  `ev_99999999999999999999`); every object created afterwards received the same
  id and silently overwrote the previous one. Ids and `nextId` are now bounded
  (2^48) and out-of-range values are refused.
- A history event whose type was an inherited object name (`constructor`,
  `__proto__`, `toString`) made the importer throw and leak an internal error
  message; it now returns a normal validation error.
- "New workspace" pressed inside a demo discarded the user's own saved workspace
  behind a prompt that read as if it meant the demo. Inside a demo the button is
  now "My workspace" and only opens your workspace; in your own workspace the
  prompt names the workspace and how many claims and sources it discards, and
  an empty workspace is replaced without asking.
- A JSON file exported from a demo and imported as your workspace was not saved,
  so it and any edits vanished on refresh. Imported files now become your
  workspace and persist; importing while viewing a demo moves you to it.
- Stored review labels outside the four allowed values now get an error that
  names the allowed labels.
- Import resolves references in records and review bases only to records in
  the file: a reference such as `constructor` or `__proto__` is refused instead
  of matching a built-in name. (History events are display-only and are not
  checked against records.)
  Duplicate history event ids are refused.
- Claims without a label were shown by internal id (`clm_2`) in the impact
  banner, history and report while the list showed "1", "2"; all views now use
  the list position.
- On desktop the whole page could scroll about 400px past the layout because a
  hidden file input was positioned below the fold; the header no longer scrolls
  away.
- Review and history times are shown in the viewer's local time instead of
  unlabelled UTC.
- The review form no longer pre-selects "Supported within stated scope"; a
  label must be chosen. The current state and the last verdict are shown
  separately, and a claim that rests on dependencies gets a matching hint.
- Space on a focused claim card no longer scrolls the list; Chinese mode
  translates the remaining accessibility labels and the recording's alt text,
  no longer marks your own text as English, and links to the Chinese FAQ.
- Clearer counters ("1 current, 1 superseded", "Workspace history"); report
  columns read "Created" / "Time"; the report with full source text gets its
  own file name; the landing video drops duplicate caption tracks (captions are
  burned in).
- The desktop workspace header fits on one row at 1280px in English and
  Chinese; the duplicate "Home" button is gone (the underlined app name returns
  to the start page).

### Docs
- The live FAQ page is generated from docs/FAQ.md at build time, so the two can
  no longer differ. FAQ, README and CONCEPTS wording corrected where the sweep
  found them ahead of or behind the code.
- Screenshots, GIF and recordings re-captured from this version.

### Tests
- 18 new unit tests and 12 new end-to-end flows; the demo flow now records
  requests made during page load as well. Every new test was checked by
  re-introducing its defect and watching it fail (18 distinct defects; three
  tests had to be strengthened before their defect was caught).

## [0.1.0-alpha.2] - 2026-09-13

Point release from the pre-launch review (five review lenses plus adversarial
verification on the deployed alpha.1).

### Fixed
- Landing GIF and video were stretched to 1280×800 and the video caused
  horizontal scrolling; both now keep their aspect ratio inside the column.
- "Review your text" from the landing silently discarded an unsaved workspace;
  it now restores the session workspace. Demo workspaces are no longer written
  to session storage, so a demo visit cannot overwrite your work.
- Import: history events are now validated by id pattern and by a per-type
  field whitelist; a malformed event id could previously set `nextId` to NaN.
  The placeholder label `unreviewed` is refused for stored reviews.
- The "include full source text" report option is now reachable from the UI.
- The demo video follows the language toggle; the version selector no longer
  overflows the Sources pane; every text field has an accessible name; the
  landing link is visible on narrow screens.

### Changed
- Privacy wording now says exactly what happens: no request ever goes to another
  origin (`connect-src 'none'`); demo media is fetched from the same host.
- README: demo 1 has three confirmed dependencies; Node 22.12 or newer.
- CONCEPTS/FORMAT wording aligned with the code (superseded bindings, history
  event fields, optional fields, stored review labels).

## [0.1.0-alpha.1] - 2026-09-13

First public alpha.

### Added
- Claims and source texts with immutable, hashed versions.
- Passage binding by character offset to a specific source version.
- Human review labels (supported within scope / partially supported / not supported / cannot determine) recorded with rationale and the exact versions they were based on.
- Explicit claim-to-claim dependencies, confirmed or unconfirmed, with cycle and dangling-reference protection.
- Derived "needs re-review" state with reasons and dependency path; nothing is flipped automatically.
- Impact report for a source revision: direct, indirect (confirmed), potential (unconfirmed), unaffected.
- JSON export/import (`eosi-workspace` format 0.1) with structural, referential, hash and cycle validation.
- Standalone HTML report with escaped content and no scripts.
- Three synthetic demos: correction impact, scope check, missing-then-supplemented.
- English and Simplified Chinese interface; desktop three-pane layout and narrow-screen tabs.
- Strict Content-Security-Policy in production builds; no network requests after load. (Overstated: same-origin demo media is fetched after load. Corrected in 0.1.0-alpha.2.)
