Fix: Auth Tab Persists on Refresh

- Title: fix(auth): persist active tab on page refresh using URL routing
- label: [bug, auth]
- description: Refreshing the page on the registration form redirects back to login. Replace `useState` tab management with URL-based routing (`/auth/signin`, `/auth/signup`) so the active tab survives refresh.


