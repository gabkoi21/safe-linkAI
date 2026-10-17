# Phase 8: Community and administration

## Goal and baseline

Replace sample community content with explicitly shareable results and operational controls. The homepage currently filters a fixed list of sample hashes, shows illustrative statistics, and opens information dialogs for resource content. Template user administration exists.

## Dependencies

Phase 7. Community publishing may be deferred if excluded from the agreed release scope.

## Tasks

- [ ] Define public report fields, opt-in consent, redaction, publication eligibility, and withdrawal/deletion behavior.
- [ ] Keep raw private messages, uploaded bytes, personal identifiers, and sensitive URL parameters out of public results.
- [ ] Implement paginated public submissions and hash lookup with access controls and abuse limits.
- [ ] Distinguish no result, private/unavailable result, service error, and loading states without exposing private records.
- [ ] Replace sample hashes and fixed relative timestamps with actual publication data.
- [ ] Replace illustrative statistics with defined, aggregated metrics or remove them until available.
- [ ] Give resource cards real article/detail destinations and supported publication content.
- [ ] Adapt admin user management for SafeLink and add scoped job failure, quota, moderation, and provider-health controls where needed.
- [ ] Record administrative actions without logging unnecessary submitted content.

## Deliverables

Opt-in public report summaries, community search, real resources/metrics, and authorized administration.

## Acceptance criteria

- [ ] Private analyses do not appear in community listings, search, statistics that reveal individuals, or public report responses.
- [ ] Only eligible, explicitly published records appear and withdrawal follows the documented policy.
- [ ] Community timestamps, verdicts, and search results reflect stored data.
- [ ] Non-admin users cannot invoke administrative API actions.
- [ ] Sample metrics and placeholder article actions are removed or visibly retained as previews for deferred scope.

## Source references

Homepage `submissions`, `articles`, search, and statistics in `frontend/src/routes/_layout/index.tsx`; `frontend/src/routes/_layout/admin.tsx` and `frontend/src/components/Admin/`.
