# Spacecraft Studio

A standalone building and interior **concept** MVP. This project is independent of the DPE/Databricks application; no existing DPE code or configuration is used.

**Draft concept — professional review required.** Generated layouts are not construction drawings, code approvals, engineering advice, or Vastu certification.

## Run locally

Use **Node.js 24 LTS** and npm. Dependencies and a lockfile are included.

```sh
cd /Users/gyana.panda/Projects/spacecraft-studio
npm install
npm run dev
```

Open http://127.0.0.1:5173. No environment file, account, paid service, or API key is needed. `npm ci` can replace `npm install` for reproducible installs. Production preview:

```sh
npm run build
npm run preview
```

The application uses React, TypeScript, Vite, Tailwind CSS, React Router, Zod, and Lucide icons. All visual assets are bundled code-native SVGs; there are no external images, fonts, analytics, or AI calls.

## Try the customer flow

1. Start a project or select a home, office, or warehouse example on the landing page.
2. Complete the five-step brief. Supported types: home, office, warehouse/godown, shop/commercial, custom, and interior-only.
3. Specify city/locality, width/depth, metres/feet, shape, north orientation, road sides, floors and optional INR budget. Every floor needs at least one assigned space. For irregular sites, confirm that the envelope is a rectangle inside your actual boundary.
4. Add/edit rooms, requested areas, categories, priorities, per-room notes and overall constraints. Choose an interior room/style and optional individual Vastu preferences.
5. Generate the concept. Zoom or scroll the SVG, select a floor, inspect requested/allocated areas and design notes, or edit and regenerate a new version.
6. Export the selected floor as SVG, or the entire version history as JSON. Print/PDF includes all floors, allocations and assumptions. Browser print settings control page size and backgrounds.
7. Open **My projects** to reopen, rename, delete or import a JSON backup. Imports create a new project and version IDs in the currently selected storage mode; references/uploads/leads are not copied.
8. Request a consultation from a saved project's results page. A name, email and explicit consent are required. **Local demo requests stay in this browser; nobody is notified.** Cloud requests are stored for manual operator review; there is no automatic email integration.

Local projects, leads and draft text use versioned browser localStorage keys (`spacecraft-studio:v1` and `spacecraft-studio:draft:v1`). Clearing site data deletes them. Other people with access to the same browser profile can access this demo data; avoid sensitive real customer information in shared browsers. The project store validates data before loading or overwriting it. Corrupted project data raises an error and is retained for recovery. Export backups before clearing browser storage. Reference-image previews use temporary object URLs, are session-only in demo mode and are never used to infer geometry.

## Optional Supabase

Copy `.env.example` to `.env.local` and supply your own project's **public** URL and publishable key. Restart Vite after changing environment values.

| Variable                        | Purpose                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Supabase project URL; optional                                                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public publishable key (or legacy public anon key); optional                                     |
| `VITE_WHATSAPP_NUMBER`          | Actual contact number in international digits, optionally prefixed by `+`; blank hides WhatsApp  |
| `SITE_URL`                      | Build-time public HTTP(S) origin for sitemap/canonical generation; no path/trailing slash needed |

All `VITE_` values are public frontend configuration. **Never put a service-role/secret key, database password, AI key or payment secret in a `VITE_` variable.** No secret is needed by this frontend. With neither Supabase value configured, the app remains a local demo.

### Set up a disposable/local stack

Install Docker and the Supabase CLI using their official instructions, then:

```sh
supabase start
supabase db reset
supabase test db
```

The checked-in `supabase/config.toml` runs local APIs on port 54321. Use the local stack's public URL/key in `.env.local`. Local email confirmation is disabled for testing; enable it and configure real authentication email delivery for a hosted customer pilot.

### Set up a hosted project (manual)

1. Create a Supabase project in the appropriate region. Apply `supabase/migrations/202611220001_initial.sql` through its SQL editor, or link the CLI and use `supabase db push`. Never reset a database containing customer data.
2. Set Auth's Site URL to the actual frontend origin and configure permitted redirects. Enable email/password signup, password/security policies and email confirmation as appropriate. Configure a production email provider before relying on signup emails.
3. Configure the two public Supabase variables in the frontend. Open **Sign in** in the storage bar, create an account and sign in. Select **Supabase cloud** explicitly.
4. Create a new cloud project. Local projects stay separate; export/import a JSON backup only if you deliberately want a copy in cloud storage. Wizard drafts are still recovered locally on the current browser.
5. Test private JPEG/PNG uploads (maximum 5 MB), reopen/versioning, and consultation recording. Signed image links expire after 60 seconds. Images are references only.
6. Repeat with two distinct customer accounts and verify isolation through the actual Data API and Storage endpoints before a real customer pilot.

The schema includes Auth-linked profiles, projects, immutable project versions, uploaded-file references, leads and service areas. RLS restricts customers to records they own and checks the parent project for related records. `save_project` validates payloads and saves a project plus new versions atomically, under a project transaction lock. Customers cannot directly update versions, change ownership or edit administrative content. Project deletion cascades versions, leads and file references; the client removes referenced storage objects before deleting the project. Failed uploads clean up their object when possible. Operators should periodically reconcile storage objects against file references because storage/network operations cannot share a database transaction.

Authentication sessions use Supabase's browser session storage. Signing in never imports demo data, and cloud errors never silently fall back to local persistence. This MVP loads a small customer project library in one request; add pagination before large accounts approach API row limits. Cloud project history is limited to 100 versions per project; export and start a new project at that point.

See the primary [database RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) and [storage access-control guide](https://supabase.com/docs/guides/storage/security/access-control).

## Configuration and architecture

- `src/pages/` contains route-level screens; `src/components/` contains shared fields, buttons, dialogs, interior boards and icons. `src/PlanView.tsx` renders the SVG, and `src/models.ts` defines/validates the typed data contracts.
- `src/config.ts` is the administrative configuration for project types, starter room presets, samples, interior palettes and explicitly named Vastu rules. Rules specify category/direction/description and can be revised by a qualified reviewer. There is no hidden prompt text or browser-admin write endpoint.
- `src/service-areas.json` is the source of truth for built public service pages. Its two locations are **illustrative** and do not claim confirmed local service availability. Update the corresponding SQL service-area records through reviewed migrations if using that catalog downstream. The app intentionally uses the same build-time area configuration in local and cloud modes.
- `src/engine.ts` implements `LayoutEngine`, `PreferenceEvaluator` and the disabled future `AIProvider` contract. `src/storage.ts` implements the same `ProjectRepository` interface for local and Supabase storage.
- Database leads are accessible to their customer and trusted operators through the Supabase dashboard/service-side tooling. No operator dashboard, privileged browser key, customer-controlled admin role or hidden-button security is shipped. Restrict operator access through Supabase project permissions.
- `scripts/public-pages.mjs` generates unique service-page title/description HTML, canonical links and sitemap (when `SITE_URL` is set), robots rules and basic security headers. Cloudflare Pages supplies the SPA fallback after matching static service-page HTML. Private routes get noindex metadata/headers and are omitted from the sitemap. Metadata generation is not full server rendering; service-page body content is rendered by React.

### Deterministic geometry and preference boundaries

The same brief produces the same geometry. The engine normalizes to metres, reserves a circulation strip and, for multiple floors, a stair/landing strip on each floor. It orders essential spaces first and recursively partitions the remaining rectangle by requested area. All entered rooms are retained; actual areas scale proportionally, including preferred rooms. Priority affects partition order, not a promise to preserve a minimum area. A starter envelope must be at least 3 m wide/deep, and resulting room zones must be at least 1.2 m wide/deep and 2 m²; these are engine feasibility bounds, **not building-code standards**. Maximums are 5 floors, 30 spaces, and 500 in each entered linear unit. Invalid or infeasible briefs return errors rather than incomplete layouts.

Individual room widths/depths follow the partition and are not user-locked; the room requirement is a target area. Recorded roads, budget, free-text constraints and room notes do not automatically change access, cost or geometric validity. No doors, windows, plumbing, structure, wall thickness or legally verified setbacks are modeled. Circulation and stair reserves do not demonstrate connectivity, evacuation, floor-to-floor alignment suitability or safe stair geometry. An irregular site uses only the user-confirmed rectangular envelope; there is no polygon clipping or survey verification.

Vastu checks compare matching room centres against a simple normalized compass-zone calculation. “Consider” evaluates the base partition; “Prioritize” scores up to four deterministic partitions and retains the best feasible one. Statuses are **considered**, **unmet**, **conflict**, or **unevaluable**. A category with several rooms passes a preference if at least one centre matches. Unknown rules, absent categories, conflicting selected directions and unachieved preferences are explained. Entrances, openings, furniture orientation and complete Vastu traditions are outside this check. Saved versions retain their original notes until a new version is generated. There is no compliance guarantee.

Interior SVGs are mood illustrations, not measured furniture layouts or representations of completed projects. No AI provider is enabled. A future provider must run server-side, keep secrets out of the frontend, and receive customer plans/personal information only after specific explicit consent; consultation consent does not authorize AI sharing.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

If installed Chrome is preferred (including corporate networks where browser downloads require organization CA configuration):

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

For additional local QA, start the dev server, then run `node scripts/check-accessibility.mjs` and `node scripts/visual-check.mjs`. These use installed Chrome by default and write screenshots/print sample to ignored `test-results/visual/`. Do not disable TLS verification to download test tooling; use approved CA configuration or installed Chrome.

- Unit tests cover all project types, deterministic geometry, non-overlap/bounds, units, floors, shortages, feasibility, Vastu orientation/conflicts, input validation and corrupted-store recovery.
- Browser tests cover each brief type on desktop/mobile, edits/version history, downloads, consent/request persistence, rename/delete/reopen, draft recovery, interior controls, navigation and print visibility.
- `npm run test:db` executes the **actual migration and 24 TAP ownership/validation assertions** in PGlite (embedded PostgreSQL) with minimal `auth`/`storage` interface stubs. It omits the unavailable `pgcrypto` extension there; UUID generation is built into PostgreSQL. This checks SQL and RLS behavior, not Supabase email, JWT signing, file transport, signed URLs, or hosted API configuration.
- `supabase test db` runs the same rollback-only policy scenarios on an actual disposable Supabase stack. CLI/Docker integration is a separate required pilot check. Automated accessibility scans are useful checks, not a claim of full accessibility certification.

## Cloudflare Pages deployment (documentation only)

No external account has been connected and no public site has been deployed.

1. Connect **this standalone repository** to a new Cloudflare Pages project. Do not use the unrelated DPE application as the Pages root.
2. Set Node version to `24`, build command to `npm run build`, output directory to `dist` and root directory to the repository root.
3. Set `SITE_URL` to the assigned `https://…pages.dev` origin or your verified custom origin; rebuild after the final origin is known. Add optional public Supabase/WhatsApp variables only if configured.
4. Deploy manually when you choose to publish. The build creates static service metadata routes, `_headers` and `robots.txt`. Pages handles unmatched SPA routes by default because this build has no top-level `404.html`; avoid a catch-all rewrite that bypasses the static service pages. Confirm direct navigation to `/new`, `/projects` and both service routes; verify `/sitemap.xml` when `SITE_URL` is set.
5. Set Supabase Auth's allowed origin/redirect configuration, then smoke-test two-account isolation, upload access and consent forms on the deployed origin.

Reference: [Cloudflare's React/Pages deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/). Cloudflare currently promotes Workers for new projects as well; this MVP retains the requested Pages target and needs no Pages Functions.

### Prototype limits and growth

Checked **22 November 2026**; provider terms and allowances can change. Check current terms, eligibility and limits before serving paying customers.

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): Free includes 500 builds/month, one concurrent build, 20-minute build timeout, 20,000 site files and a 25 MiB maximum per static asset. Functions, if added later, have separate Workers quotas.
- [Supabase pricing](https://supabase.com/pricing): Free lists two active projects, 500 MB database/project, 1 GB file storage, 50,000 monthly active users, 5 GB egress and 5 GB cached egress. Free projects may pause after a week of inactivity. Pro starts at USD 25/month and includes seven days of daily backups; verify current compute, additional-project and overage charges.

For a customer pilot, establish backup/restore procedures, operator ownership of consultation requests, privacy/retention/deletion practices, email delivery and usage monitoring. Upgrade Supabase before inactivity, storage, traffic or backup needs exceed the free setup; watch image egress and history growth. Use appropriate SMTP/email delivery, pagination, operational error monitoring and tested storage cleanup as volume grows. Review Cloudflare build/asset needs and any future server execution separately. Set spending controls where supported and test restore procedures before relying on paid-service features.

Payments are intentionally absent. A later integration should create checkout sessions on a trusted backend, keep prices/order state server-side and confirm payment using verified, idempotent webhooks. Never trust a browser redirect as proof of payment.

## Delivery boundaries

**Implemented:** responsive landing/library/service/interior screens; five-step brief for six types; deterministic multi-floor concepts; editable areas/names/requirements; optional configurable Vastu notes; versioned browser persistence; SVG/JSON export/import and print/PDF; consent-based consultation records; optional Supabase email/password, cloud adapter and private upload flow; migration/RLS tests; configuration-based administration.

**Illustrative or intentionally absent:** local service availability, brand/contact configuration until supplied, interior mood imagery, actual designer assignment/notifications, cost estimation, polygon packing, CAD editing, engineering drawings, live AI and payments. Cloud adapter code is provided; actual hosted Auth/Storage/API behavior must be exercised with your credentials before customer use.

**Professional review required:** surveyed boundaries, structural design, load-bearing decisions, local codes and permissions, setbacks, access/circulation, accessibility, fire/evacuation safety, ventilation, plumbing/electrical services, material/fixture suitability and Vastu interpretation.
