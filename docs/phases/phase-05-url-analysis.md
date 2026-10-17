# Phase 5: URL analysis

## Goal and baseline

Investigate URLs through controlled backend services. Currently, the UI accepts HTTP/HTTPS URLs, shows a local validation review, and opens a fixed demo report with an illustrative score of 60. No destination is fetched.

## Dependencies

Phase 3.

## Tasks

- [ ] Preserve local validation and repeat authoritative validation on the server.
- [ ] Define canonicalization, internationalized-domain display, credential-bearing URL handling, and sensitive query-string retention.
- [ ] Block loopback, private, link-local, metadata, and other disallowed destinations, including IPv6 and alternate address representations.
- [ ] Validate resolved addresses and every redirect; protect against DNS rebinding and restrict worker network access.
- [ ] Bound redirects, response sizes, connection/read timeouts, and overall investigation time.
- [ ] Collect supported evidence such as redirect destinations, domain/reputation signals, and available page indicators with timestamps and provenance.
- [ ] Keep inspection isolated from the user's browser; never navigate the user to a suspicious destination as part of analysis.
- [ ] Connect Quick Scan and cancellation controls to actual job behavior.
- [ ] Replace validation-only progress text when live scanning starts and distinguish unknown from a supported benign verdict.

## Deliverables

Restricted URL analysis service and a live review-to-report flow.

## Acceptance criteria

- [ ] Valid public HTTP/HTTPS inputs can complete analysis with documented evidence.
- [ ] Disallowed destinations remain blocked through redirects and DNS changes.
- [ ] Timeouts, redirect loops, unreachable domains, and unavailable reputation data produce defined outcomes.
- [ ] The frontend never presents local URL validation as completed threat analysis.
- [ ] Reports explain why a URL is concerning or why evidence is insufficient.

## Source references

URL validation, review dialog, Quick Scan control, and cancellation dialogs in `frontend/src/routes/_layout/index.tsx`; URL example in `frontend/src/components/Common/SecurityReport.tsx`.
