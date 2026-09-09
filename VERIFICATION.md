# Verification for 0.2.0

- TypeScript type check: passed.
- Cloudflare Worker build: passed.
- Standalone Node build: passed.
- `npm test`: 19 tests passed, 0 failed.
- Domain integration: 13 tests, actual SQL migrations and service/API code.
- Standalone HTTP and backup integration: 2 tests, real compiled application handler.
- Shared component contracts: 4 tests.

Coverage includes tenant boundaries, trainer and branch intersection, foreign keys, membership dates and overlap, attendance/QR validity and reuse, stock reservation, order transitions, partial-payment limits, role revocation, CSRF, pagination over 620 matching members, aggregate revenue with 610 additional receipts, native login, account session revocation, scheduled rule invocation and database/object backup restoration.

The build reports a large client chunk warning. No browser/device QA, load test, actual Docker build, external payment/SMS integration or GitHub Actions run is claimed. The scheduler test checks invocation; the existing domain suite checks automation output and deduplication.

Generated bundles, dependencies, private data and credentials are excluded from the source archive. The exported hosting manifest contains logical bindings only. The existing live Site was not redeployed by this source delivery.
