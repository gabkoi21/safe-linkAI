# Phase 9: Quality and release

## Goal and baseline

Verify the selected SafeLink release scope and deploy with observable operation and recovery procedures. Existing template tests and deployment documents provide scaffolding; their presence does not verify the new product flows.

## Dependencies

Phases 1–8 for the full release, or an explicitly documented smaller scope. Run relevant checks during each implementation phase.

## Tasks

- [ ] Reconcile existing Playwright authentication, signup, recovery, settings, admin, and item tests with the branded live workflows.
- [ ] Add end-to-end checks for message/URL/file submission, validation, cancellation, terminal states, reports, clipboard failure, and history access.
- [ ] Add backend checks for ownership, authorization, quotas, malicious URL destinations, upload limits, and worker retries/timeouts.
- [ ] Use controlled provider fixtures for repeatable tests and separately verify provider integration in staging.
- [ ] Verify keyboard access, focus management, responsive layouts, and both themes on the supported browser/device set.
- [ ] Run the frontend build and relevant backend/frontend suites; record results and known limitations.
- [ ] Configure production secrets, database migrations, private upload storage, worker processes, mail, network restrictions, and retention jobs.
- [ ] Measure expected load against the agreed concurrency, upload limits, latency, and provider budget.
- [ ] Add job failure/latency metrics, provider-health alerts, and logs with sensitive fields excluded.
- [ ] Verify backup restoration, deployment rollback, migration recovery, and retained-file cleanup in staging.
- [ ] Update product setup, API, privacy, and operating documentation to match the deployed scope.

## Verification commands

From `frontend/`, use `bun run build` and `bunx playwright test` after provisioning the required backend, database, and test configuration. Follow `backend/README.md` for backend checks and `development.md` for services. These are intended validation commands, not results recorded by this documentation task.

## Deliverables

Recorded staging verification, production configuration, operating/recovery procedures, and release notes.

## Acceptance criteria

- [ ] Build and relevant automated checks pass against the selected scope; no essential flow silently uses demo results.
- [ ] Production does not enable development guest bypass or expose private uploads/provider secrets.
- [ ] Failure, inconclusive, and unavailable-service states work across supported submission types.
- [ ] Restore and rollback procedures have been exercised, and monitoring identifies failed or stuck jobs.
- [ ] Any deferred features are hidden or clearly labeled, and remaining limitations are documented before release.

## Source references

`frontend/tests/`, `frontend/playwright.config.ts`, `frontend/package.json`, `backend/README.md`, `development.md`, `deployment.md`, and `deployment-docker-compose.md`.
