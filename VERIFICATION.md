# Verification — 22 November 2026

## Passed

- `npm run lint` — no errors.
- `npm run typecheck` — no errors.
- `npm test` — 25 unit tests across engine, preferences, schema and persistence.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=2` — all 22 desktop/mobile browser scenarios passed.
- `npm run test:db` — migration and all 24 ownership/validation assertions passed in embedded PostgreSQL (PGlite).
- `npm run build` — production build passed. Rollup emits two harmless annotation-placement warnings from Zod dependency comments.
- Build with an explicit local `SITE_URL` — sitemap includes configured service routes, excludes private project routes, and generated service HTML has unique escaped titles/descriptions.
- `node scripts/check-accessibility.mjs` — no WCAG A/AA violations reported by axe on landing, wizard entry, interiors, empty project library, contact, generated plan, design notes, interior results or revision dialog. This is an automated check, not full accessibility certification.
- Visual inspection — desktop/mobile landing and concept screens; no page overflow or browser runtime errors observed. Print-to-PDF generation completed locally; automated print checks cover all floors and assumptions.
- `npm audit` — zero reported vulnerabilities.
- Existing DPE repository — `git status --short` remained empty.

Browser scenarios include all six types, multi-floor generation, irregular-envelope acknowledgement, local image preview, zoom, editable requirements, versioning, SVG/JSON downloads, JSON import as a new project, rename/reopen/delete, consultation consent, draft recovery, interior choices, mobile navigation, keyboard dialog focus restoration, tab navigation and print visibility.

## Not executed against external services

Supabase CLI is not installed and the Docker daemon is not running. The actual Supabase Auth, Data API, Storage uploads/signed URLs and email behavior have not been tested against hosted credentials or a full local Supabase stack. PGlite runs the real application migration/policy tests with minimal auth/storage interface stubs; it is not a substitute for those integration checks. Run the documented `supabase test db` and two-account integration checks on a disposable configured stack before a customer pilot.

The Playwright-managed browser download encountered a corporate certificate-chain error. Installed Google Chrome was used successfully instead; TLS verification was not disabled.

No Cloudflare/Supabase account was modified, no public deployment was made, and no remote Git repository was connected. New files are in a separate local repository on `codex/spacecraft-studio`, with no commit created.

Consultation notifications, actual local service availability, engineering design, certified Vastu review, cost estimates, payments and live AI remain outside this MVP. See README for configuration and professional-review boundaries.
