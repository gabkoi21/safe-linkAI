# Phase 7: Reports and history

## Goal and baseline

Render real analysis output in the existing report design and let users revisit their checks. Current risk levels, scores, warning signs, and recommended actions are static examples. The template items page does not provide analysis history.

## Dependencies

Phases 4, 5, and 6 for full coverage. A partial release may support only completed input types if the UI clearly limits the available flows.

## Tasks

- [ ] Replace fixed examples with the versioned report response from phase 3.
- [ ] Define verdicts, score meaning, evidence, timestamps, analyzer/version provenance, and unavailable-data presentation.
- [ ] Support inconclusive, partial, and failed results without rendering them as safe or assigning invented scores.
- [ ] Keep the current input type, analyzed-content summary, warnings, recommendations, and copy-report interaction.
- [ ] Display potentially hostile text safely and mask sensitive content where appropriate.
- [ ] Copy the real report with its limitations and provenance; handle clipboard denial accessibly.
- [ ] Add authenticated history with pagination, type/status filters, timestamps, and report detail access.
- [ ] Define refresh/direct-link behavior and deletion for jobs and reports.
- [ ] Decide whether to replace or remove the template items screen rather than silently reusing its generic data model.

## Deliverables

Live report component, private history API/UI, and report deletion behavior.

## Acceptance criteria

- [ ] Different backend results render different supported findings; no live job falls back to demo findings.
- [ ] Reloading a report preserves access to its stored result and enforces ownership.
- [ ] History handles empty, loading, paginated, error, and deleted-report states.
- [ ] Copying preserves the actual report's meaning and succeeds or displays an accessible failure message.
- [ ] Risk communicates uncertainty and never implies guaranteed safety.

## Source references

`frontend/src/components/Common/SecurityReport.tsx`, `frontend/src/components/Common/security-report.css`, and `frontend/src/routes/_layout/items.tsx`.
