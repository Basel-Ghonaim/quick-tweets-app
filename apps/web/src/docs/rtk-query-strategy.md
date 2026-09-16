# RTK Query Strategy & Architecture

## Core Philosophy
We are introducing RTK Query incrementally to avoid destabilizing the project.
- **Axios & Legacy Auth:** Authentication and the session continue to use Axios, each from its own `gateway/`. We will not refactor them in Phase 1.
- **New Features:** All new features (e.g., Tweets, Comments, Likes) will use RTK Query for data fetching and caching.

## Folder Structure
To prevent confusion between Axios interceptors and RTK Query configuration, they are strictly isolated:
- `apps/web/src/shared/api`: Legacy Axios configurations and interceptors.
- `apps/web/src/shared/rtk-query`: RTK Query configuration (`baseApi.ts` and `unifiedBaseQuery.ts`).

## Error Normalization (The UI Contract)
A core requirement of this architecture is that UI components must remain completely agnostic of the data-fetching layer. They must always receive an `AppError`.

To achieve this, `unifiedBaseQuery.ts` wraps `fetchBaseQuery`. It intercepts any `FetchBaseQueryError` (including network failures, parsing errors, and standard backend HTTP errors) and normalizes it into our standardized `AppError` before it reaches the component hooks.

## Adding New Endpoints (Code Splitting)
1. **DO NOT** modify `baseApi.ts` to add endpoints directly.
2. In the capability, declare the endpoints in its own `gateway/` (e.g., `apps/web/src/features/tweets/gateway/`), where the [capability structure](../../../../docs/frontend/architecture.md#the-capability-structure) places a capability's calls to the server.
3. Inject the endpoints into the base API:

```typescript
import { baseApi } from '@shared/rtk-query';

export const tweetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTweets: builder.query<any, void>({
      query: () => '/tweets',
    }),
  }),
});

export const { useGetTweetsQuery } = tweetsApi;
```

## Circular Dependency Prevention
Never import `RootState` from `apps/web/src/app/store/store.tsx` into any file inside `apps/web/src/shared/rtk-query`. This creates a fatal circular dependency because the store imports `baseApi.ts`. 

To read the access token inside a base query, use the session's selector, as `unifiedBaseQuery.ts` does — it reads the session's slice without importing `RootState`:
```typescript
import { selectAccessToken, type WithSession } from '../session';

const token = selectAccessToken(getState() as WithSession);
```
