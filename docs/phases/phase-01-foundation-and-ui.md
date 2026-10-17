# Phase 1: Foundation and UI

## Goal and baseline

Establish the SafeLink product contract around the existing frontend. The public homepage, submission tabs, account previews, theme controls, and report dialogs already exist, but live workflows are not connected.

## Dependencies

None.

## Tasks

- [ ] Inventory `/`, `/#home`, `/#submit`, login, signup, recovery, settings, admin, and items routes. Decide which template screens belong in SafeLink.
- [ ] Define guest versus authenticated features, submission limits, and the first-release scope.
- [ ] Preserve the current visual language and accessible, plain-language copy across account, report, and dashboard screens.
- [ ] Verify light/dark themes, small-screen layouts, long URLs, filenames, and message text.
- [ ] Complete keyboard tab navigation, focus trapping/return, Escape behavior, and labels for tabs and dialogs, including the custom information overlay.
- [ ] Specify shared loading, empty, error, retry, and unavailable-service states before API integration.
- [ ] Keep demo reports, sample statistics, and preview-only actions clearly labeled until their services are connected.

## Deliverables

A route/feature inventory, agreed release scope, and frontend behavior requirements for later phases.

## Acceptance criteria

- [ ] Every visible action has an implemented behavior or clearly explains its preview status.
- [ ] Core flows can be navigated with a keyboard and used at mobile and desktop sizes in both themes.
- [ ] The team has recorded guest access, upload limits, and the distinction between local validation and analysis completion.

## Source references

`frontend/src/routes/_layout/index.tsx`, `frontend/src/routes/_layout/home.css`, `frontend/src/components/Common/AccountPreview.tsx`, `frontend/src/components/Common/SecurityReport.tsx`, and `frontend/src/components/theme-provider.tsx`.
