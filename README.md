# FitSpace 0.3.0

Independent, Persian RTL gym management application. This project has no dependency on the Jarchi or restaurant applications.

> راهنمای نصب فارسی: [START-HERE-FA.md](START-HERE-FA.md)

## Standalone quick start

```bash
npm ci
npm run build:standalone
npm run account:create -- --email owner@example.com --name Owner --owner
npm run start:standalone
```

Open `http://localhost:3000`. Set `FITSPACE_ORIGIN` to your HTTPS origin in production and run one Node process behind a TLS reverse proxy. Data defaults to `data/`. See the Persian guide for accounts, Docker, backups and GitHub publication.

## Group classes in 0.3.0

- Branch schedules with named rooms, assigned trainers, capacity and Persian date/time display.
- Prevent overlapping room/trainer schedules and conflicting member bookings.
- Membership eligibility on the class date, atomic seat reservation and waitlist placement.
- Cancellation promotes the first currently eligible waitlisted member; class cancellation closes reservations with in-app notifications.
- Assigned-trainer/staff rosters, attendance after start, no-show marking after end, and ICS calendar downloads.
- See [RELEASE-0.3.0.md](RELEASE-0.3.0.md) for behavior, access rules and upgrade steps.

## Implemented product

- Tenant onboarding with isolated business data and a 14-day Pro trial.
- Owner, manager, trainer, reception, and member roles; platform administrator for plan allocation. Role assignment and revocation happen on the server.
- Member records, emergency contacts, fitness goals, trainer assignment, and branch assignment.
- Configurable membership plans, renewal history, non-overlapping validity, remaining days, suspension, and derived expiration.
- Reception attendance and one-time, five-minute QR codes. Camera scanning uses the browser's BarcodeDetector where available, with manual token entry as fallback.
- Reusable workout and nutrition plans with nested day/meal builders, exercise library, assignment, and workout completion logs.
- Measurements, weight charts, and private progress-photo uploads to R2.
- Product catalog and inventory; cart and real orders with trusted server prices, inventory reservations, idempotent submission, cancellation, and fulfilment transitions.
- Recorded reception payments, partial settlement, unique receipt references, balance checks, and printable receipts. This is a receipt ledger, not an online payment processor.
- In-app notifications; idempotent membership, inactivity, stock, and program-expiry rules; retention tasks. The standalone server schedules these every five minutes; Sites keeps manual execution.
- Branches and server-side subscription entitlements; installation-owner platform administration.
- Desktop sidebar, mobile member navigation, dark/light modes, modal forms, member drawers, loading/error/empty states, and CSV exports.

## Architecture

- React + Vinext routes, Cloudflare-compatible Worker ESM.
- `app/[[...path]]/page.tsx`: authenticated route entry.
- `app/gym-app.tsx`: application composition and shared presentation components.
- `app/qr-dialog.tsx`: QR display/scanning lifecycle.
- `app/api/gym/[...path]/route.ts`: API boundary, CSRF, identity, response handling, uploads.
- `lib/gym/domain.ts`: roles, entitlements, membership calculation, Zod schemas.
- `lib/gym/service.ts`: tenant context and domain operations.
- `lib/gym/attendance.ts`: hashed QR token lifecycle.
- `lib/gym/db.ts`: prepared D1 statements and atomic batches.
- `db/schema.ts` and `drizzle/`: relational model, composite tenant foreign keys, indexes, constraints, and concurrency guards.

All tenant references are verified server-side, and composite foreign keys prevent cross-tenant references even below the service layer. Monetary amounts are integer tomans. Orders and stock updates use atomic D1 batches. Stock cannot go negative. Payments cannot settle another member's order/membership or exceed the outstanding balance. Cancellation of an order with receipts requires a future explicit refund workflow and is rejected.

Membership end dates are inclusive: a 30-day membership beginning January 1 ends January 30. The final date has zero remaining days and is still valid for entry. Dashboard month-to-date revenue uses Gregorian month boundaries; displayed dates are Persian, while HTML date inputs use ISO Gregorian dates.

## Identity and private installation

The Sites target uses dispatch-owned ChatGPT identity. The standalone Node entry implements provisioned email/password accounts and strips all inbound identity headers before injecting the verified session identity. Never expose the compiled handler directly: use `standalone/server.mjs`. Password changes and administrator resets revoke existing sessions. No public self-registration, email verification, OTP or email recovery is connected.

The first tenant created in an owner-private installation atomically provisions the sole initial platform administrator. Do not make a fresh empty installation publicly accessible before its trusted owner has initialized it. Additional gym owners do not gain platform-administrator status. Staff invitations are email allowlist entries: the verified sign-in email must match. Private Site audience restrictions are separate from application roles, so inviting a staff email does not itself make the private Site accessible to that person.

## API

Every protected endpoint requires authenticated identity. Tenant operations require `?tenant=<tenant-id>` and a matching active access record. State-changing requests require the same-origin `Origin` header. Client role controls are not authoritative.

- `GET|POST /api/gym/classes`: list schedules or create a class; list supports `from`, `to`, `q`, `branch`, `cursor`.
- `GET /api/gym/class-options`: permitted branch/trainer options for scheduling staff.
- `POST /api/gym/class-book/<id>`: reserve for self or a staff-selected `member_id`.
- `POST /api/gym/booking-cancel/<id>` and `class-cancel/<id>`: controlled cancellation.
- `GET /api/gym/class-roster/<id>?offset=0`: authorized roster, 50 rows per page.
- `PATCH /api/gym/class-attendance/<booking-id>`: `ATTENDED` or `NO_SHOW`.
- `GET /api/gym/class-calendar/<id>`: authorized ICS event content.
- `GET /api/gym/bootstrap`: identity, allowed gyms, platform-admin flag.
- `POST /api/gym/tenants`: create an independent gym.
- `GET /api/gym/page/<collection>?tenant=...&limit=50&cursor=...&q=...&branch=...`: keyset pagination, server-side search and scoped record totals; optional `member_id`, `kind`, `from`, `to`.
- `GET /api/gym/report?tenant=...&from=YYYY-MM-DD&to=YYYY-MM-DD&branch=...`: all-record aggregates for a maximum 366-day date range.
- `GET /api/gym/state?tenant=...`: scoped current working data and aggregate dashboard counters.
- `GET|POST /api/gym/<collection>?tenant=...`: allowed collection operations.
- `PUT /api/gym/<collection>/<id>?tenant=...`: supported record edits.
- `PATCH /api/gym/<collection>/<id>?tenant=...`: controlled state changes or access revocation.
- `POST /api/gym/qr-issue` and `qr-checkin`: short-lived attendance credentials.
- `POST /api/gym/photos`: multipart image upload, authenticated member ownership and file signature checks.
- `GET /api/gym/photo/<id>`: private, authorized image stream.
- `POST /api/gym/automations-run`: idempotent on-demand rule evaluation.
- `GET|POST /api/gym/platform`: installation administrator's tenant plan management.

Mutations are rate-limited per authenticated user in a one-minute window. All API responses containing data are `private, no-store`. Image uploads are limited to 5 MiB and supported raster formats; keys contain no user-supplied filenames.

## Verification

```
npm run install:ci
npx tsc --noEmit
node --test tests/gym-domain.test.mjs
npm run build
```

The domain integration suite executes real migrations and production service/API code against an in-memory SQLite adapter for D1. It covers tenant and role isolation, cross-tenant FK rejection, membership validity and daily check-in deduplication, QR expiry/reuse, trusted pricing, inventory reservation and cancellation, payment balance and lifecycle, entitlements, notification deduplication, CSRF, and role revocation. It is not a Cloudflare load test or a browser E2E test.

## Operational limits and next integrations

This is an operational MVP, not a claim of completed commercial rollout or proven million-record scalability.

- No real gateway, recurring SaaS billing, payment webhook, refunds, or email/SMS/push provider is connected. Plan assignment does not charge anyone. The standalone scheduler runs while its Node server is running, including when browsers are closed; Sites rules run on demand.
- Primary lists are paginated; reports aggregate all authorized rows. State bootstrap and secondary profile panels retain 100 recent rows per collection. CSV downloads paginate every matching row in browser memory and do not provide a transactional snapshot.
- The Sites deployment starts owner-private. A commercial launch needs an intentional audience/access rollout, gym-specific public identity flow, operational logging/monitoring, backup/restore rehearsal, retention/deletion controls, load tests, and browser/device QA.
- Add external notification providers behind an outbox/worker and gateway adapters with signature verification/idempotent reconciliation; never reinterpret a manual receipt as a gateway settlement.
- Advanced loyalty, wallet, AI recommendations, white label, and external developer APIs remain future modules.

## Deployment

The Site's `.openai/hosting.json` owns its identity and logical `DB` / `BUCKET` bindings. Sites provisions resources and applies generated migrations before Worker publication. Never put live database IDs or credentials in source. Apply future schema changes by appending migrations; deployed migrations are immutable.

## Standalone operations

`standalone/storage.mjs` adapts D1 batches and R2 operations to SQLite and local files. Migrations run once with checksum validation. `standalone/auth.mjs` owns account/session data separately. `standalone/backup.mjs` performs offline backups and restores into new directories only. Node native builds are in `dist-standalone`; Worker builds remain in `dist`.

`npm test` checks types, builds both targets, then runs all test suites. `.github/workflows/ci.yml` contains the same workflow; it has not run on GitHub yet. Docker configuration is supplied but has not been executed here. No browser or load testing is claimed.

See [CHANGELOG.md](CHANGELOG.md). The archive excludes runtime data, credentials, dependencies and generated bundles. It contains the full source, lockfile, SQL migrations, tests and deployment scripts. Run `bash scripts/publish-github.sh fitspace-gym-os` after `gh auth login` to create and push a new private GitHub repository.

## Repository versions

[Main source](https://github.com/Mamaad75/fitspace) contains 0.3.0. The `release/0.2.0` and `release/0.3.0` branches preserve each delivered version. No production Site redeployment accompanies this source update.
