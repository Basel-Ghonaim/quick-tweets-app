Fix: Auth Tab Persists on Refresh

- Title: fix(auth): persist active tab on page refresh using URL routing
- label: [bug, auth]
- description: Refreshing the page on the registration form redirects back to login. Replace `useState` tab management with URL-based routing (`/auth/signin`, `/auth/signup`) so the active tab survives refresh.

---

### Feature: Frontend Foundation — Routes, Layout, RTK Query, Pagination

- **Title:** feat(client): frontend foundation — routes, layout, RTK Query infrastructure
- **Labels:** [frontend, feature, infrastructure]
- **Branch:** `feat/frontend-foundation`
- **Description:**

Set up frontend infrastructure for the data features. No feature modules — only scaffolding.

**Steps:**

- [ ] RTK Query infrastructure — baseApi + baseQueryWithReauth + store wiring
- [ ] Shared pagination types + API response types
- [ ] MainLayout + Sidebar scaffold
- [ ] Routes — main layout + auth guard + modal pattern
- [ ] Generic Modal component shell

---

### Fix: Shared API & Error Layer — Contract, Architecture, Reliability

- **Title:** fix(client): shared API & error layer — contract mismatch, DIP violation, retry logic
- **Labels:** [frontend, fix, architecture]
- **Branch:** `fix/shared-api-errors`
- **Description:**

Audit findings from `shared/errors` and `shared/api`. Backend error contract mismatch, dependency inversion in authClient, no retry logic, hardcoded baseURL.

**Commits:**

- [ ] fix(client): backend error contract — read from `response.data.error`
- [ ] refactor(client): extract API baseURL to environment config
- [ ] refactor(client): decouple authClient from Redux — setupAuthClient pattern
- [ ] fix(client): scope refresh state per client instance
- [ ] refactor(client): merge econnaborted into timeout, explicit barrel exports
- [ ] feat(client): add retry interceptor for transient failures
- [ ] docs(client): add JSDoc to error layer + API layer
