# Phase 4: Message analysis

## Goal and baseline

Analyze pasted email, SMS, and chat content. Currently, any non-empty message opens a fixed demo report with an illustrative score of 85.

## Dependencies

Phase 3.

## Tasks

- [ ] Define supported languages, message limits, and the evidence needed for each warning category.
- [ ] Implement extraction of relevant indicators such as urgency, credential requests, payment redirection, and claimed identity.
- [ ] Select and configure the analysis engine/provider; keep credentials server-side and document data handling.
- [ ] Treat submitted messages as untrusted content, including instructions intended to manipulate an AI analyzer.
- [ ] Return structured warnings tied to submitted evidence, a summary, limitations, and recommended actions.
- [ ] Define scoring or verdict rules with an inconclusive outcome; do not report unsupported certainty.
- [ ] Connect the Message tab to job submission and expose pending, failure, retry, and completion states.
- [ ] Keep pasted content out of routine logs and apply the retention policy.

## Deliverables

Message analyzer, documented output mapping, and a live frontend message flow.

## Acceptance criteria

- [ ] Benign, suspicious, ambiguous, empty, and oversized fixtures exercise different appropriate outcomes.
- [ ] Warnings are supported by the submitted content rather than the current fixed examples.
- [ ] Submitted instructions cannot change the analyzer's output contract or trigger unauthorized tool use.
- [ ] Service failures show an unavailable/failed result rather than a fabricated verdict.
- [ ] The report explains uncertainty and provides practical next steps in plain language.

## Source references

Message submission in `frontend/src/routes/_layout/index.tsx` and the message example in `frontend/src/components/Common/SecurityReport.tsx`.
