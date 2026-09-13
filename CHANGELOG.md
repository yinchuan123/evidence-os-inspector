# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0-alpha.3] - 2026-09-14

Point release from the post-release verification of alpha.2 on the live site
(two independent checkers per earlier finding). The eight re-checked fixes held;
the checkers found four adjacent defects, fixed here.

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

### Tests
- 9 new unit tests (id bounds, inherited type names, label message) and 4 new
  end-to-end flows (workspace safety); the demo flow now records requests made
  during page load as well. Every new test was checked by re-introducing the
  defect and watching it fail.

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
