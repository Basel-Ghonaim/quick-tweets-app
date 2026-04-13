# Auth Hooks

> **Module path:** `src/modules/auth/hooks/`
> This is the **public interface** of the auth feature. No component outside this module should import from any path deeper than `@modules/auth/hooks`.

---

## Table of Contents

| Section | Description |
|---|---|
| [Core Philosophy](#core-philosophy) | Guiding principles behind the architecture |
| [Architecture Flow](#architecture-flow) | How data moves through the layer |
| [File Structure](#file-structure) | What each file owns |
| [TypeScript Implementation](#typescript-implementation) | Generics, contracts, and type safety |
| [Step-by-Step Usage](#step-by-step-usage) | Concrete examples for every public hook |
| [API Reference](#api-reference) | Return values for every hook |
| [Future Roadmap](#future-roadmap) | Planned improvements and pending epics |

---

## Core Philosophy

This hooks layer is built on four rules that cannot be broken:

**1. Components own zero auth logic.**
`LoginForm`, `RegisterForm`, `Header` — none of them dispatch to Redux, read from localStorage, or call the API directly. They receive data and handlers from hooks.

**2. The barrel is the only import path.**
```typescript
// ✅ Correct
import { useLoginFlow } from "@modules/auth/hooks";

// ❌ Never do this
import { useLoginFlow } from "@modules/auth/hooks/useAuthFlow";
```

**3. Internal infrastructure is invisible.**
`useAuthActions` and `useAuthFormBase` are never exported. Any hook not in `index.ts` does not exist from the outside world's perspective.

**4. No `any`. No `as`. No exceptions.**
Every type is inferred or explicitly declared. `useAuthFormBase` is generic over `TSchema` so TypeScript narrows the return type independently for login and register.

---

## Architecture Flow

```
Component
    │
    │  calls
    ▼
useLoginFlow / useRegisterFlow / useLogout / useAuthState
    │
    │  delegates to
    ▼
useAuthFormBase (private)          useAuthState (reads only)
    │         │
    │         │
    ▼         ▼
useSchemaForm   useRequestState ◄── useAppSelector
(form engine)   (status flags)          │
    │                                   ▼
    │                           state.auth.requests[type]
    ▼
useAuthActions (dispatches)
    │
    ▼
Redux Store ◄──► REST API ◄──► authErrorHandler ◄──► AppError
```

**Key separation:**
- `useSchemaForm` owns form state (values, errors, local `isSubmitting`)
- `useRequestState` owns server state (isLoading, isSuccess, isError, error)
- `useAuthFormBase` merges them into one unified surface
- Consumer hooks are 3-line configuration wrappers

---

## File Structure

```
src/modules/auth/hooks/
├── index.ts            Public barrel — the only import surface
├── useAuthActions.ts   INTERNAL — Redux dispatch orchestration. Not exported.
├── useAuthFlow.ts      INTERNAL base + public useLoginFlow / useRegisterFlow
├── useLogout.ts        Public — global logout action hook
└── useAuthState.ts     Public — read-only auth identity accessor
```

| File | Public? | Responsibility |
|---|---|---|
| `index.ts` | ✅ Barrel | Single import surface for all consumers |
| `useAuthActions.ts` | ❌ Internal | Wraps Redux dispatch calls for login, register, logout |
| `useAuthFlow.ts` | ⚠️ Partial | Private base `useAuthFormBase` + public `useLoginFlow`, `useRegisterFlow` |
| `useLogout.ts` | ✅ | Logout action + error side-effect |
| `useAuthState.ts` | ✅ | Read-only identity: `user`, `token`, `isLoggedIn` |

---

## TypeScript Implementation

### `AuthFlowReturn<TSchema>` — the form hook contract

```typescript
export interface AuthFlowReturn<
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
> {
  values: FormValue<TSchema>;                        // Typed field values
  errors: Record<keyof TSchema, string | null>;      // Per-field error messages
  isSubmitting: boolean;                             // Local + server loading merged
  isSuccess: boolean;                                // Server confirmed success
  isError: boolean;                                  // Server reported failure
  serverError: AppError | null;                      // Structured error (type, message, status)
  handleChange: FormChangeHandler;                   // Defined in schema-form, not duplicated
  handleSubmit: FormSubmitHandler;                   // Async submit — always (e: SubmitEvent)
}
```

> **Why generics?** `useLoginFlow()` returns `AuthFlowReturn<LoginSchema>` and `useRegisterFlow()` returns `AuthFlowReturn<RegisterSchema>`. TypeScript infers the exact field shape for `values` and `errors` independently — no union, no `any`.

### Handler types are defined once

Handler signatures live in `@shared/schema-form/types/schema.types.ts`:

```typescript
export type FormChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;
export type FormChangeHandler = (e: FormChangeEvent) => void;
export type FormSubmitHandler = (e: SubmitEvent) => Promise<void>;
```

Both `useSchemaForm` (implementation) and `AuthFlowReturn` (interface) import from this single source. If the engine changes, both update automatically.

---

## Step-by-Step Usage

### Login Form

```typescript
import { useLoginFlow } from "@modules/auth/hooks";

const LoginForm = () => {
  const {
    values,
    errors,
    isSubmitting,
    isSuccess,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useLoginFlow();

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
      />
      {errors.email && <span>{errors.email}</span>}

      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
      />

      {isError && serverError && (
        <p className="error-banner">{serverError.message}</p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};
```

---

### Register Form

```typescript
import { useRegisterFlow } from "@modules/auth/hooks";

const RegisterForm = () => {
  const { values, errors, isSubmitting, handleChange, handleSubmit } =
    useRegisterFlow();

  // Same pattern as LoginForm — values/errors are automatically
  // scoped to the register schema fields.
};
```

---

### Logout Button

```typescript
import { useLogout } from "@modules/auth/hooks";

const Header = () => {
  const { logout, isSuccess, isError } = useLogout();

  // isSuccess → redirect to /login after logout
  // isError   → show error state on the button

  return <button onClick={logout}>Log out</button>;
};
```

> **Note:** `isLoading` is intentionally absent from `useLogout`. The logout action is synchronous — it never dispatches `authRequestPending`. When server-side token revocation is added, `isLoading` will be restored.

---

### Reading Auth Identity

```typescript
import { useAuthState } from "@modules/auth/hooks";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuthState();
  return isLoggedIn ? children : <Navigate to="/login" />;
};

const Header = () => {
  const { user } = useAuthState();
  return <span>Welcome, {user?.username}</span>;
};
```

> **Note:** `isLoggedIn` is derived from `!!token && !!user`. It is never stored as a separate field in Redux — that would create two sources of truth.

---

## API Reference

### `useLoginFlow()` / `useRegisterFlow()`

| Return value | Type | Description |
|---|---|---|
| `values` | `FormValue<TSchema>` | Live form field values, keyed by field name |
| `errors` | `Record<keyof TSchema, string \| null>` | Per-field validation error messages |
| `isSubmitting` | `boolean` | `true` while local validation runs OR server request is pending |
| `isSuccess` | `boolean` | `true` after server confirms success |
| `isError` | `boolean` | `true` after server reports failure |
| `serverError` | `AppError \| null` | Structured error with `message`, `type`, `status` |
| `handleChange` | `FormChangeHandler` | Attach to `onChange` of any input |
| `handleSubmit` | `FormSubmitHandler` | Attach to `onSubmit` of the form element |

---

### `useLogout()`

| Return value | Type | Description |
|---|---|---|
| `logout` | `() => void` | Call to clear the local auth session |
| `isSuccess` | `boolean` | `true` after session was cleared successfully |
| `isError` | `boolean` | `true` if session clearing failed |

---

### `useAuthState()`

| Return value | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current authenticated user object from Redux |
| `token` | `string \| null` | Current JWT token from Redux |
| `isLoggedIn` | `boolean` | Derived: `!!token && !!user` |

---

## Future Roadmap

### 🔴 Blocked — Toast Epic
`useLoginFlow`, `useRegisterFlow`, and `useLogout` all have `TODO: [Toast Epic]` markers. Currently, server errors are logged to the console. A global Toast notification system must be built before these markers can be replaced.

**Entry points:**
- `useAuthFlow.ts` → `onError` callback inside `useSchemaForm`
- `useLogout.ts` → `useEffect` watching `logoutError`

---

### 🟡 Pending — Server-side Logout
`useLogout` currently only clears the local session. When refresh token support is added, a `POST /logout` server call must be made inside `useAuthActions.logout()` **before** clearing the local session. `useLogout` must then expose `isLoading`.

---

### 🟡 Pending — `useRequestState` in Shared
`useRequestState` lives in `src/shared/hooks/`. Any feature module that reads Redux request status should use it instead of writing `state.xxx.status === "loading"` inline. Document this pattern in the shared hooks README when it is written.

---

### 🔵 Improvement — Selector Memoization
If `state.auth.user` is a large object, `useAuthState` will cause re-renders when any field on `user` changes — even fields the component does not use. Consider field-specific selectors with `shallowEqual` from React-Redux for high-frequency consumers.

```typescript
// Example: component that only needs username
const username = useAppSelector(
  (state) => state.auth.user?.username,
);
```
