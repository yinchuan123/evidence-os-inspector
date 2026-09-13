# Roadmap

This is the public roadmap for Evidence OS Inspector. Dates are intentions, not
promises. Items move only when there is evidence from real use. Nothing listed
under a future phase is implemented yet unless the changelog says so.

## v0.1 alpha (released 2026-09-13)

- Versioned claims and sources, positional bindings, anchored reviews.
- Confirmed / unconfirmed dependencies with propagation of "needs re-review".
- Impact report for source revisions; JSON round-trip; standalone HTML report.
- Three synthetic demos; English and Simplified Chinese interface; desktop and
  narrow-screen layouts; strict CSP, no network use.

## Next: real use and fixes (first 1–2 weeks after release)

Goal: learn from about ten volunteers who try it on their own non-sensitive
text. We are looking for recurring, specific needs rather than "looks nice".

- Collect: where people get stuck, what they expected, whether they came back,
  whether they shared a report.
- Fix the problems that recur. Ship small point releases (v0.1.x).
- Track publicly: GitHub issues labelled `feedback`.

## Then: fit into existing workflows (roughly weeks 3–4, adjusted by feedback)

Pick **one** extension that clearly reduces user effort, not all of them:

- Easier import: e.g. paste-from-clipboard with automatic sentence proposals,
  or `.docx` text extraction (client-side, no upload).
- A generic Skill / MCP-style adapter so an AI writing assistant can *read*
  a workspace and *propose* bindings or rationales that a person then confirms.
  Proposals would be clearly marked as unreviewed.
- Small-scale support for a common reference export (e.g. RIS/BibTeX titles
  and identifiers as source metadata, still "user-provided, not verified").

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

## How to influence this

Open an issue with a concrete situation: the text you were reviewing (or a
description), what you tried, and what you needed. Issues with real examples
are prioritised over feature wishes.
