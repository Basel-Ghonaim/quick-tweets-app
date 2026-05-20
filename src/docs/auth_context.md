# Front-End Authentication Gateway — System Context

## 1. Architecture & Principles

- **Clean Architecture** — strict layered separation: `types/` (domain) → `entity/` (domain models) → `dto/` (API contracts) → `mapper/` (DTO↔Entity transforms) → `repository/` (data-access interface + REST impl) → `services/` (session persistence, error enrichment) → `hooks/` (use-case orchestration) → `components/` → `pages/`
- **Dependency rule**: inner layers never import outer layers. Hooks compose repository + services + store.
- **Repository pattern**: `AuthRepository` interface decouples business logic from HTTP transport. Single impl: `restAuth` (Axios-backed).
- **Mapper pattern**: `AuthMapper` interface defines `toAuthResponse`, `loginCredentialsToDto`, `registerCredentialsToDto`. Isolates DTO shape changes from domain.
- **Factory functions**: all services/repos/mappers are factory-returned (no classes, no singletons). Enables testability via DI.
- **Barrel exports**: every directory has `index.ts`. Module root exports only public API: `AuthPage`, `authReducer`, `authActions`.

---

## 2. Tech Stack & Typing

| Layer | Tech |
|---|---|
| Framework | React 18 + TypeScript |
| State | Redux Toolkit (`@reduxjs/toolkit`) — `createSlice` |
| HTTP | Axios (two instances: `authClient`, `apiClient`) |
| Routing | `react-router-dom` v6 (`BrowserRouter`, `Routes`, `Route`) |
| Validation | Custom schema-form system (`@shared/schema-form`) |
| Storage | `localStorage` via `AppStorage` abstraction |

### Key Types

```ts
// Domain
User { id: number; username: string; name: string; email: string; profileImage: string|null; bio: string; createdAt: string }
AuthResponse { user: User; accessToken: string }
LoginCredentials { username: string; password: string }
RegisterCredentials extends LoginCredentials { name: string; email: string; profileImage: File|null; confirmPassword: string; privacy: boolean }

// DTOs (API wire format)
LoginRequestDto { username: string; password: string }
RegisterRequestDto { username: string; name: string; email: string; password: string }
AuthResponseDto { user: UserDto; accessToken: string }
UserDto { id: number; username: string; name: string; email: string; profileImage: string|null; bio: string; createdAt: string }
RefreshResponseDto { accessToken: string }

// State
RequestStatus = "idle" | "loading" | "success" | "error"
RequestState<TError=AppError> { status: RequestStatus; error: TError|null }
AuthState { user: User|null; accessToken: string|null; requests: { login: RequestState; register: RequestState; logout: RequestState } }
AuthRequestType = "login" | "register" | "logout"

// Error system
ErrorType = "network"|"server"|"validation"|"not_found"|"unauthorized"|"forbidden"|"canceled"|"timeout"|"conflict"|"too_many_requests"|"econnaborted"|"bad_request"|"unknown"|"payload_too_large"|"unsupported_media_type"|"service_unavailable"
AppError<T extends ErrorType> extends Error { type: T; status: number; errors?: ErrorPayload<T> }
ErrorPayload<"validation"> = Record<string, string[]>  // field-level errors
```

---

## 3. State Management & Token Flow

### Redux Slice (`authSlice`)

- **Name**: `"auth"`
- **Reducers** (all synchronous, no thunks):
  - `authRequestPending({ requestType })` → sets `requests[type].status = "loading"`
  - `authRequestFulfilled({ requestType, user?, accessToken? })` → sets status `"success"`, optionally writes `user` + `accessToken`
  - `authRequestRejected({ requestType, error })` → sets status `"error"` with `AppError`
  - `clearAuthError({ requestType })` → resets to idle if currently error
  - `authLogout()` → full state reset to `initialState`
- **No async thunks** — all async orchestration in `useAuthActions` hook

### Token Storage Model

| Data | Storage | Persistence |
|---|---|---|
| `accessToken` (JWT) | Redux store (in-memory) | **None** — lost on refresh/tab close |
| `user` object | Redux + `localStorage` (key: `"user"`) | Survives page reload |
| Refresh token | **httpOnly cookie** (server-managed) | Automatic via `withCredentials: true` |

### Token Lifecycle

1. **Login/Register** → API returns `{ user, accessToken }` → dispatch `authRequestFulfilled` (stores in Redux) + `saveAuthSession` (persists user to localStorage)
2. **Every outgoing request** → `attachTokenInterceptor` reads `reduxStore.getState().auth.accessToken` → sets `Authorization: Bearer <token>`
3. **401 response** → `responseInterceptor` triggers silent refresh:
   - Calls `POST /auth/refresh` (cookie sent automatically)
   - On success → `onTokenRefreshed` dispatches new accessToken to Redux → retries original request
   - On failure → `onSessionExpired` clears localStorage user + dispatches logout
4. **Concurrent 401s** — mutex pattern: first 401 triggers refresh, subsequent 401s queue as promises. All retried after single refresh resolves.
5. **App startup (`useInitAuth`)** → reads cached `user` from localStorage → if exists, calls `POST /auth/refresh` → success: hydrate Redux with user+token → failure: clear stale session

### Bootstrap Flow

```
useInitAuth() (runs once in App)
  └→ localStorage.get("user")
      ├→ null → setIsInitializing(false), show login
      └→ User exists → POST /auth/refresh
          ├→ 200 → dispatch authRequestFulfilled(user, newToken) → authenticated
          └→ error → clearAuthSession() → show login
```

---

## 4. Routing & Guards

### Route Structure

```
<BrowserRouter>
  <Routes>
    /auth        → redirect to /auth/signin
    /auth/signin → <AuthPage />
    /auth/signup → <AuthPage />
  </Routes>
</BrowserRouter>
```

- **No explicit route guards yet** — protected routes not implemented (only auth module exists)
- **Auth gate**: `useInitAuth` blocks rendering with loading screen while session restore is in-flight. `isInitializing === true` → renders "Loading..." fullscreen
- **Tab detection**: `AuthPage` reads `location.pathname` to determine active tab (`signin` | `signup`). Tab switch navigates via `navigate("/auth/<tab>", { replace: true })`
- **Auth status**: `useAuthState()` returns `{ user, accessToken, isLoggedIn: !!accessToken && !!user }`

---

## 5. Core File Map

### `modules/auth/`

| File | Purpose |
|---|---|
| `index.ts` | Barrel: exports `AuthPage`, `authReducer`, `authActions` |
| `types/AuthCredentials.ts` | Domain types: `LoginCredentials`, `RegisterCredentials` |
| `entity/AuthResponse.ts` | Domain model: `AuthResponse { user: User; accessToken }` |
| `dto/AuthRequest.ts` | Wire DTOs: `LoginRequestDto`, `RegisterRequestDto` |
| `dto/AuthResponse.ts` | Wire DTOs: `AuthResponseDto`, `UserDto` |
| `dto/RefreshResponse.ts` | Wire DTO: `RefreshResponseDto { accessToken }` |
| `mapper/Mapper.ts` | Interface: `AuthMapper` (3 mapping functions) |
| `mapper/authMapper.ts` | Impl: DTO↔Entity transforms |
| `repository/AuthRepository.ts` | Interface: `login`, `register`, `logout`, `refresh` |
| `repository/restAuth.ts` | Axios impl: POST to `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/refresh` |
| `store/state/AuthState.ts` | Type: `AuthState`, `AuthRequests` |
| `store/state/initialState.ts` | Default state — hydrates `user` from localStorage, `accessToken` always null |
| `store/types/AuthPayloads.ts` | Action payload types: `AuthRequestPayload`, `*Fulfilled`, `*Rejected` |
| `store/authSlice.ts` | RTK slice: 5 reducers, no thunks |
| `services/authSessionService.ts` | `saveAuthSession(user)`, `clearAuthSession()`, `getUser()` via `appStorage` |
| `services/authErrorHandler.ts` | Maps `AppError.type` → auth-specific user messages |
| `hooks/useAuthActions.ts` | Orchestrator: `login()`, `register()`, `logout()` — dispatches + calls repo + persists session |
| `hooks/useAuthFlow.ts` | Schema-form integration: `useLoginFlow()`, `useRegisterFlow()` — form state + request state |
| `hooks/useAuthState.ts` | Selector: `{ user, accessToken, isLoggedIn }` from Redux |
| `hooks/useInitAuth.ts` | Bootstrap: restores session on app mount via refresh token |
| `hooks/useLogout.ts` | Logout hook: wraps `useAuthActions().logout` with request state tracking |
| `config/authFormSchemas.ts` | `loginFields` (2 fields), `registerFields` (7 fields) with validators + layout spans |
| `config/validationMessages.ts` | `VALIDATION_MESSAGES` — required, minLength, maxLength, match, emailFormat, privacy |
| `pages/AuthPage.tsx` | Split layout: `<LeftPanel />` + `<RightPanel />`, tab routing via URL |
| `components/LeftPanel/` | Branding/hero panel |
| `components/RightPanel/` | Auth forms container: `AuthForm/`, `AuthTabs/`, `OAuthButtons/` |

### `shared/` (auth-relevant)

| File | Purpose |
|---|---|
| `api/authClient.ts` | Axios instance: `baseURL`, `withCredentials: true`, token interceptor, 401 refresh interceptor |
| `api/client.ts` | Public Axios instance: no auth, error normalization only |
| `api/interceptors/request.ts` | `attachTokenInterceptor` — injects Bearer token from callback |
| `api/interceptors/response.ts` | `responseInterceptor` — error normalization + 401 refresh with concurrent-request queue |
| `errors/AppError.ts` | `AppError<T>` class: `type`, `status`, `errors` |
| `errors/types.ts` | `ErrorType` union (17 variants), `httpStatusMap`, `ValidationErrorsPayload` |
| `errors/errorNormalizer.ts` | Catches Axios/AppError/unknown → returns `AppError` |
| `errors/errorFactory.ts` | `createAppError()`, `createUnknownError()` |
| `storage/AppStorage.ts` | `AppStorage` interface, `STORAGE_KEYS = { USER: "user" }` |
| `storage/storageFactory.ts` | `localStorage` impl with JSON serialization, `appStorage` singleton |
| `types/user.ts` | `User` interface |
| `types/requestStatus.ts` | `RequestStatus`, `RequestState<TError>` |
| `hooks/useRequestState.ts` | Derives `{ isIdle, isLoading, isSuccess, isError, error }` from `RequestState` |

### `app/`

| File | Purpose |
|---|---|
| `store/store.tsx` | `configureStore({ auth: authReducer })`, exports `RootState`, `AppDispatch` |
| `store/hooks.ts` | Typed hooks: `useAppDispatch`, `useAppSelector` |
| `routes/App.tsx` | Root component: `useInitAuth` gate → `BrowserRouter` with auth routes |

---

## 6. API Integration

### Endpoints

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | None | `LoginRequestDto` | `AuthResponseDto` |
| POST | `/auth/register` | None | `RegisterRequestDto` | `AuthResponseDto` |
| POST | `/auth/logout` | Bearer | — | void |
| POST | `/auth/refresh` | Cookie | — | `RefreshResponseDto` |

### Axios Configuration

- **Base URL**: `http://localhost:4000/api/v1`
- **Two clients**:
  - `authClient` — `withCredentials: true`, token interceptor, 401 refresh interceptor
  - `apiClient` — no auth, error normalization only
- **Timeout**: 10000ms
- **Headers**: `Accept: application/json`

### Error Handling Pipeline

```
Axios error
  → responseInterceptor (401 → refresh flow OR pass-through)
  → errorNormalizer (AxiosError → AppError via parseAxiosError, or unknown → createUnknownError)
  → authErrorHandler (enriches AppError with auth-specific messages for: validation, conflict, forbidden, too_many_requests)
  → dispatch authRequestRejected({ requestType, error: AppError })
  → error re-thrown to caller (useAuthFlow onError callback logs to console)
```

### Concurrent Refresh Mutex

```
401 received (not retry, not /auth/refresh):
  if isRefreshing:
    → push to pendingRequests queue → await token
  else:
    isRefreshing = true
    → POST /auth/refresh
      → success: onTokenRefreshed(newToken), processPendingRequests(token), retry original
      → failure: processPendingRequests(null, error), onSessionExpired(), reject
    isRefreshing = false
```
