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
