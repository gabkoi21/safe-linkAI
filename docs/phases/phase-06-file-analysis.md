# Phase 6: File analysis

## Goal and baseline

Upload and inspect files in isolation. The frontend currently selects one file up to 250 MB and sends only its name to the demo report. The file bytes are not scanned.

## Dependencies

Phase 3.

## Tasks

- [ ] Confirm supported file formats and production size limits across browser, proxy, API, storage, and analysis provider.
- [ ] Enforce limits server-side using bounded/streamed uploads and verify detected content type independently of the filename.
- [ ] Store uploads under generated identifiers in private quarantine storage, outside executable and publicly served paths.
- [ ] Compute a SHA-256 digest and capture safe metadata without treating the digest alone as a verdict.
- [ ] Integrate the selected static-analysis or malware-scanning engine; run parsers and scanners with resource limits and restricted permissions.
- [ ] Define handling for archives, encrypted files, malformed documents, decompression bombs, and unsupported types.
- [ ] Do not execute samples in the application process; any future dynamic analysis requires a separate isolation design.
- [ ] Add upload progress, scan status, cancellation, and upload-failure retry behavior to the File tab.
- [ ] Apply retention/deletion to uploaded bytes and derived content; define safe hash-cache reuse without leaking another user's data.

## Deliverables

Private upload pipeline, bounded file-analysis worker, and live file results.

## Acceptance criteria

- [ ] Empty, oversized, unsupported, and misleading-extension files have explicit outcomes.
- [ ] Harmless scanner test fixtures and benign files verify the pipeline without running malicious samples.
- [ ] Upload completion and scan completion are presented as separate states.
- [ ] Files cannot be downloaded publicly or executed by the web application.
- [ ] Deleted/expired uploads are removed according to the recorded retention policy.

## Source references

`selectFiles`, file input, drag/drop zone, and file preview in `frontend/src/routes/_layout/index.tsx`; file example in `frontend/src/components/Common/SecurityReport.tsx`.
