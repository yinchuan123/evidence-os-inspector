# Evidence OS Inspector

**See what changes when your evidence changes.**

Trace research claims to source passages, record reviews, and see which claims
need another look when a source changes. Runs entirely in your browser: no
account, no upload, no API key.

[中文说明](README.zh-CN.md) · **[Live demo](https://yinchuan123.github.io/evidence-os-inspector/)** · [Releases](https://github.com/yinchuan123/evidence-os-inspector/releases) · [FAQ](docs/FAQ.md) · [Roadmap](ROADMAP.md)

> **Status: v0.1 alpha.** Version tracking, structural checks, dependency
> tracking, change flags and report generation are automatic; you choose the
> passages to bind. Whether a passage
> actually supports a claim is a judgement a person records. See
> [What it does not do](#what-it-does-not-do).

![Screen recording: correcting source A marks claims C1 and C4 as needing re-review while C2, C3 and C5 stay reviewed.](docs/media/demo-loop.gif)

## Try it in two minutes

1. Open the [live demo](https://yinchuan123.github.io/evidence-os-inspector/) and click **Try demo**.
2. Select claim **C1**. The passage it is bound to is highlighted in source A (on a phone, open the *Sources* tab to see it).
3. In *Sources*, pick "Synthetic cohort report A", click **Revise source**, then **Load suggested correction**, and save.
4. Read the impact banner: **C1** is affected directly, **C4** through a confirmed dependency, and C2, C3, C5 are not affected.
5. Select C1. In *Sources*, select the corrected sentence in version 2 with the mouse and click **Bind selection to C1**. Then choose a label, write a rationale and click **Record review**. The old review stays in history.
6. **Export HTML report** to get a standalone file you can send to a co-author.

Then click the app name at the top left to return to the start page, click
**Review your text**, paste a paragraph of your own, split it into claims, add
the source text you are checking against, and do the same.

All demo studies are invented. They show the mechanics, not real evidence. The
demo texts are in English; the interface is also available in Chinese.

## Who it is for

Inspector is a small tool for demonstrating the mechanism, teaching, and
collecting feedback. It is not a production tool for systematic-review teams.

**Suited to**

- Teams that maintain evidence over time (living systematic reviews, guideline
  groups, evidence and HTA centres) who want to try the mechanism on a small
  set of key claims.
- Teaching research methods: how a claim depends on evidence, and what a
  correction does to it. See the [classroom exercise](docs/TEACHING.md).

**Not suited to, today**

- Detecting retractions or corrections. Inspector does not look for them. Use
  reference-level alerts for that, such as
  [Zotero's retracted item notifications](https://www.zotero.org/blog/retracted-item-notifications/)
  (retractions only) or
  [scite Reference Check](https://scite.ai/blog/how-do-i-use-the-scite-reference-check)
  (retraction and correction notices).
- Tracking changed numbers in data-extraction tables. Inspector binds text
  passages.
- Reviews with hundreds of studies. Binding is manual.
- Team collaboration. There are no shared workspaces.

**Why this matters.** Of 1,330 retracted trials, 312 had been pooled in 4,095
meta-analyses in 847 systematic reviews. Of the 3,902 meta-analyses that could
be re-analysed without them, 16.0% changed statistical significance (Xu 2025,
BMJ). When a trial was retracted after a review was published, 9 of 196 reviews
and 2 of 43 guidelines were later corrected or retracted (Kataoka 2022, J Clin
Epidemiol). After removing the retracted study, 96% of 166 recalculated
meta-analyses stayed within the original confidence interval, but 11% changed
statistical significance (Graña Possamai 2025, JAMA Intern Med). Inspector
covers only the step after a change is known: which recorded claims are bound
to the changed source, or depend on such claims through confirmed links.

## Screenshots

| Claim bound to a source passage | Impact of a source correction | Standalone HTML report |
|---|---|---|
| ![Source comparison](docs/media/shot-source-comparison.png) | ![Change impact](docs/media/shot-change-impact.png) | ![Exported report](docs/media/shot-report.png) |

## Three scenarios

1. **Correction impact.** Five claims, three sources, three confirmed dependencies.
   Source A corrects its main result. The tool computes, from recorded bindings
   and confirmed dependencies, that C1 and C4 need re-review and the rest do not.
2. **Scope check.** A source reports an association in adults over 70 with a
   specific outcome. One draft sentence generalises the population, swaps the
   outcome, and uses causal wording. The reviewer's rationale records each
   mismatch against the bound passage.
3. **Missing, then supplemented.** A claim cannot be judged from the trial
   summary. The appendix is added later, the claim is bound to it and
   re-reviewed. The earlier "cannot determine" verdict remains in history.

## How it works

- **Versions are immutable.** Editing a source or a claim creates a new version
  with a SHA-256 content hash. Old versions stay.
- **Bindings are positional.** A claim is bound to a character span in one
  specific source version. No page numbers are invented for plain text.
- **Reviews are anchored.** A review records a label, a rationale, and exactly
  which source versions and upstream claim reviews it was based on.
- **Dependencies are explicit.** You add claim-to-claim links and mark them
  confirmed or unconfirmed. Cycles and dangling references are rejected.
- **Nothing flips automatically.** When a basis changes, the claim is marked
  *Needs re-review* with the reason and the dependency path. Unconfirmed links
  only produce a "potential impact" note.
- **Export is explicit.** JSON keeps everything for continued work; the HTML
  report contains claims, bound passages, states and history, and includes full
  source text only if you tick "include full source text" before exporting.

Details: [docs/CONCEPTS.md](docs/CONCEPTS.md) · JSON format: [docs/FORMAT.md](docs/FORMAT.md)

## What it does not do

- It does not decide whether a passage supports a claim. You do.
- It does not verify DOIs or URLs, and it does not fetch papers. Identifiers are
  stored as *user-provided, not verified*.
- No PDF or OCR import, no AI reading, no database, no multi-user server, no
  automatic GRADE or meta-analysis. See the [roadmap](ROADMAP.md) for what is
  being considered next.
- A content hash shows whether recorded text changed. It says nothing about
  scientific truth, authorship, or meaning.

## Related tools

The mechanism is not new. Similar ideas are used elsewhere:

- Requirements traceability tools mark a link as "suspect" when the linked item
  changes, for example [Doorstop](https://github.com/doorstop-dev/doorstop).
- Recent open-source projects apply similar ideas to other domains, for example
  [Proofline](https://github.com/thangldw/proofline), which binds engineering
  decisions to source versions and cited spans and flags affected decisions for
  review, including through dependencies.
- Claims-management software for pharmaceutical promotional review anchors
  claims to passages in reference documents, for example
  [Veeva Vault PromoMats](https://commercial.veevavault.help/en/gr/57379/).
- In evidence synthesis, tools flag retracted or corrected references at the
  level of the whole reference, for example
  [Zotero](https://www.zotero.org/blog/retracted-item-notifications/)
  (retractions) and
  [scite Reference Check](https://scite.ai/blog/how-do-i-use-the-scite-reference-check)
  (retraction and correction notices).

We have not found a tool in evidence synthesis that combines passage binding,
version-bound reviews and transitive re-review flags. If you know one, please
[open an issue](https://github.com/yinchuan123/evidence-os-inspector/issues).

## Privacy

Your text is processed in the browser and never leaves it. The production
build ships a strict Content-Security-Policy: `connect-src 'none'` blocks
fetch, XHR and WebSockets entirely, and scripts, styles, images and media may
load only from the site's own origin. After load, the only requests the page
makes are for the demo media on that same static host; nothing goes to any
other origin. Exporting creates a local file. Your own workspace (including any file you
import) is kept in the tab's session storage so a refresh does not lose it;
demo workspaces are rebuilt fresh on every load and never replace yours. Ordinary web-server access logs for the hosting page belong
to GitHub Pages, like any static site.

## Run locally

Requires Node.js 22.12 or newer (the pinned test runner needs it).

```bash
git clone https://github.com/yinchuan123/evidence-os-inspector.git
cd evidence-os-inspector
npm ci
npm run dev
```

Open http://localhost:5173. Other commands:

```bash
npm test            # unit tests (vitest)
npm run build       # production build in dist/
npm run verify      # typecheck + lint + tests + Pages build + e2e (needs: npx playwright install chromium)
```

## Input formats

- Paste text, or import `.txt` / `.md` into the claims box or as source text.
- Import a workspace JSON exported by this tool (`eosi-workspace`, format 0.1).

## Contributing

Real usage reports are the most valuable contribution right now. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License and citation

Code is released under the [MIT License](LICENSE). To cite the software, use
the metadata in [CITATION.cff](CITATION.cff) (GitHub shows a "Cite this
repository" button).

## Relation to Evidence OS

Inspector is a small, standalone tool extracted from a larger private
evidence-compilation system. It shares the ideas of versioned sources,
positional bindings, and correction propagation, but it is not that system and
does not include its data. Any future public interface will be listed in the
roadmap only when real public material exists.
