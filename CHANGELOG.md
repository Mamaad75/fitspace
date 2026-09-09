# Changelog

## 0.3.0

- Group-class schedule and enrollment UI with branch/date/search filters and pagination.
- Tenant-scoped class and booking schema; append-only migrations 0003 and 0004.
- Room/trainer overlap guards, member schedule conflict protection, date-valid membership eligibility.
- Atomic seat allocation, idempotent ordinary retries, waitlist and eligible FIFO promotion on cancellation.
- Class cancellation with transactional in-app notices; scoped rosters and trainer/staff attendance.
- ICS calendar files with UTC times, escaped text and UTF-8 line folding.
- Concurrent HTTP reservation test against the real standalone runtime.
- Upgrade instructions and preserved GitHub release branches.

## 0.2.0

- Standalone Node deployment with SQLite and local private object storage; Sites Worker target preserved.
- Administrator-provisioned email/password accounts, scrypt password hashing, persistent login throttling, CSRF checks, 12-hour sessions and password-change session revocation.
- Server-owned identity injection; inbound identity headers are removed.
- In-process five-minute scheduler for eligible gym automations, with QR/session/rate-limit cleanup.
- Keyset pagination and server search, member/branch/date filters, joined member names and full outstanding balances.
- Combined trainer and branch scoping and exact notification ownership checks.
- Date-range reports over all authorized records and complete paged CSV exports.
- Async record selectors, report filters, pagination controls and standalone account links.
- Offline checksum-verified backup/restore, object inclusion and session invalidation after restore.
- Persian installation guide, Docker/Compose templates, CI and private GitHub publishing helper.
- Regression coverage for 620 members, 610 additional payments, native HTTP login and backup round-trip.

## 0.1.0

Initial Persian gym SaaS: tenant roles, members, memberships, attendance QR, training/nutrition, progress, inventory/orders, receipt ledger and in-app automation rules.
