# Phase 3: Submission API and jobs

## Goal and baseline

Replace local preview submissions with an API and persistent job lifecycle. The registered backend routes currently cover template accounts and items, not threat analysis.

## Dependencies

Phases 1 and 2. Any anonymous submission path requires an explicit access and quota decision.

## Tasks

- [ ] Define submission, analysis job, report, and evidence models with database migrations and ownership rules.
- [ ] Define the API contract for creating submissions, reading job status, retrieving reports, and requesting cancellation.
- [ ] Use explicit states such as queued, running, completed, failed, and cancelled; specify allowed transitions and cancellation limits.
- [ ] Implement asynchronous processing with bounded timeouts, retries, concurrency, and idempotency behavior.
- [ ] Validate content and size on the server; specify message length, URL length, upload, and per-user limits.
- [ ] Specify retention and deletion for submitted text, URLs, uploaded bytes, reports, and logs.
- [ ] Add quotas/rate limits and safe error responses without submitted secrets or provider credentials.
- [ ] Regenerate the OpenAPI client and connect submissions with TanStack Query status updates.
- [ ] Define whether closing a dialog leaves a job running; distinguish that action from cancelling a server job.
- [ ] Replace local-only privacy claims when data starts leaving the device.

## Proposed contract to finalize

These are design proposals, not existing endpoints: `POST /api/v1/analyses`, `GET /api/v1/analyses/{id}`, `GET /api/v1/analyses/{id}/report`, and `POST /api/v1/analyses/{id}/cancel`. Finalize multipart versus JSON submission handling before generating the client.

A job should expose an ID, input type, status, timestamps, and a safe error code when applicable. Reports should carry a schema version and analysis provenance. Progress may be indeterminate; do not invent completion percentages.

## Deliverables

Versioned API contract, migrations, worker lifecycle, generated client, and frontend job-state integration.

## Acceptance criteria

- [ ] An accepted submission returns a stable job ID and reaches a terminal state.
- [ ] Ownership checks prevent one user from reading or cancelling another user's private job.
- [ ] Retries and duplicate requests do not silently create duplicate work.
- [ ] Provider failure, worker interruption, cancellation races, and oversized input have defined outcomes.
- [ ] The frontend differentiates local validation, queued work, analysis, and completion.

## Source references

`frontend/src/routes/_layout/index.tsx`, `frontend/src/client/`, `backend/app/api/main.py`, `backend/app/models.py`, and `backend/app/alembic/versions/`.
