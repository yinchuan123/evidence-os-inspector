# Roadmap

This is the public roadmap for Evidence OS Inspector. Dates are intentions, not
promises. Items move only when there is evidence from real use. Nothing listed
under a future phase is implemented yet unless the changelog says so.

## v0.1 alpha (released 2026-09-13)

- Versioned claims and sources, positional bindings, anchored reviews.
- Confirmed / unconfirmed dependencies with propagation of "needs re-review".
- Impact report for source revisions; JSON round-trip; standalone HTML report.
- Three synthetic demos; English and Simplified Chinese interface; desktop and
  narrow-screen layouts; strict CSP, no requests to any other origin.

## Next: real use and fixes (first 1–2 weeks after release)

Goal: learn from about ten volunteers who work on living systematic reviews,
guidelines or research-methods teaching, and who try it on their own
non-sensitive text. We are looking for recurring, specific needs rather than
"looks nice".

- Collect: where people get stuck, what they expected, whether they came back,
  whether they shared a report.
- Fix the problems that recur. Ship small point releases (v0.1.x).
- Track publicly: GitHub issues with the `feedback` label (open an issue and describe what you tried).

## Then: teaching and demonstration (roughly weeks 3–4, adjusted by feedback)

Inspector stays a small browser-only tool for demonstration, teaching and
feedback.

- Chinese demo texts, so the demos can be followed without English
  ([issue #3](https://github.com/yinchuan123/evidence-os-inspector/issues/3)).
- Improve the classroom exercise in [docs/TEACHING.md](docs/TEACHING.md) from
  the feedback of people who teach with it or try it.
- Small usability fixes that come up in real use.

## Later: a public interface to Evidence OS (no date)

Inspector grew out of a larger private evidence-compilation system. A public
interface will be added only when there is real public material to connect
to: a published reproduction example, a preprint, verified compatibility, and
licensing that allows it. Until then this section stays a statement of intent.

## Explicitly not planned for v0.x

- Automatic truth or quality judgement of claims.
- Server-side storage, accounts, or real-time collaboration.
- Fetching papers, resolving DOIs, or PDF/OCR import.
- Automatic GRADE, risk-of-bias, or meta-analysis.
- Automatic detection of retractions, corrections or new versions of sources.
- Binding to numbers in data-extraction tables.
- Import from reference managers or systematic-review platforms.

Detecting retractions, corrections or new versions needs outside records that a
browser-only tool without network access does not have. Binding to numbers and
importing from other software are left out to keep v0.x small.

## How to influence this

Open an issue with a concrete situation: the text you were reviewing (or a
description), what you tried, and what you needed. Issues with real examples
are prioritised over feature wishes.
