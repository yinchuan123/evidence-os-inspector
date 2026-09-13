# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
- Strict Content-Security-Policy in production builds; no network requests after load.
