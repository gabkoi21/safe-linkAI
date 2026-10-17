# Phase 2: Accounts and access

## Goal and baseline

Connect the branded account screens to existing backend authentication. `AccountPreview.tsx` currently displays local notices; `useAuth.ts` and the generated client already contain account integration scaffolding.

## Dependencies

Phase 1.

## Tasks

- [ ] Wire signup and login to backend services through the existing authentication hook and generated client.
- [ ] Map full name, email, password confirmation, and required terms acceptance to a documented account contract; add backend support where required.
- [ ] Add pending states, duplicate-account and credential errors, and prevention of duplicate submits.
- [ ] Reconcile recovery/reset routes with the branded account screens and verify email delivery and expired-token handling.
- [ ] Define session expiry and logout behavior; clear protected cached data when the user signs out or changes identity.
- [ ] Review the existing token-storage approach and implement the chosen session mechanism consistently.
- [ ] Connect profile updates, password changes, and account deletion to authenticated user state.
- [ ] Enforce administrator permissions on the server as well as the frontend.
- [ ] Keep `VITE_SKIP_LOGIN` limited to development; a client-side token check must not grant server access.
- [ ] Replace preview terms/privacy text with content describing actual data handling before live collection.

## Deliverables

Working registration, login, recovery, logout, and account settings with access controls.

## Acceptance criteria

- [ ] A new user can register, log in, reload, update their profile, and log out.
- [ ] Invalid credentials, expired sessions, and expired reset tokens produce actionable errors.
- [ ] Protected APIs reject unauthenticated requests and non-admin users cannot perform admin actions.
- [ ] Remembering an email never stores the user's password.
- [ ] Account deletion follows the agreed policy for associated submissions and reports.

## Source references

`frontend/src/components/Common/AccountPreview.tsx`, `frontend/src/hooks/useAuth.ts`, `frontend/src/lib/guestMode.ts`, `frontend/src/routes/_layout.tsx`, `frontend/src/components/UserSettings/`, and `backend/app/api/routes/login.py` and `users.py`.
