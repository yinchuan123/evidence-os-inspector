# Contributing

Thanks for looking. This is an alpha; the most useful contributions right now are
real usage reports.

## Report what you tried
Open an issue with: what text you were reviewing (non-sensitive, or a description),
what you expected, what happened, and your browser. If a JSON export reproduces it
and contains nothing private, attach it.

## Run locally
```bash
npm ci
npm run dev        # http://localhost:5173
npm run verify     # typecheck, lint, unit tests, production build, e2e
```
End-to-end tests need Playwright's Chromium: `npx playwright install chromium`.

## Ground rules for changes
- Versions are immutable. Never mutate a stored source or claim version.
- Nothing flips a review verdict automatically. Derived state may say
  "needs re-review"; only a person records a new label.
- Everything a user types is untrusted: escape on render, validate on import,
  never emit non-http(s) links.
- No remote assets, analytics, or network calls in the app.
- Add or adjust a test with every behavioural change (`src/**/*.test.ts` for the
  core, `tests/e2e` for the UI).

## Scope
See [ROADMAP.md](ROADMAP.md). Features listed there as "later" are welcome as
discussion first; please open an issue before a large PR.

## License
By contributing you agree that your contributions are licensed under the MIT
License in this repository.
