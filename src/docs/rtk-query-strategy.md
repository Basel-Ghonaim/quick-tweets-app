# RTK Query Strategy & Architecture

## Core Philosophy
We are introducing RTK Query incrementally to avoid destabilizing the project.
- **Axios & Legacy Auth:** The `auth` module and its API calls continue to use Axios. We will not refactor them in Phase 1.
- **New Features:** All new features (e.g., Tweets, Comments, Likes) will use RTK Query for data fetching and caching.

## Folder Structure
To prevent confusion between Axios interceptors and RTK Query configuration, they are strictly isolated:
- `src/shared/api`: Legacy Axios configurations and interceptors.
- `src/shared/rtk-query`: RTK Query configuration (`baseApi.ts` and `unifiedBaseQuery.ts`).

## Error Normalization (The UI Contract)
A core requirement of this architecture is that UI components must remain completely agnostic of the data-fetching layer. They must always receive an `AppError`.

To achieve this, `unifiedBaseQuery.ts` wraps `fetchBaseQuery`. It intercepts any `FetchBaseQueryError` (including network failures, parsing errors, and standard backend HTTP errors) and normalizes it into our standardized `AppError` before it reaches the component hooks.

## Adding New Endpoints (Code Splitting)
1. **DO NOT** modify `baseApi.ts` to add endpoints directly.
2. In your feature module, create a dedicated API file (e.g., `src/modules/tweets/api.ts`).
3. Inject the endpoints into the base API:

```typescript
import { baseApi } from '../../shared/rtk-query/baseApi';

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
Never import `RootState` from `src/app/store/store.tsx` into any file inside `src/shared/rtk-query`. This creates a fatal circular dependency because the store imports `baseApi.ts`. 

If you need to access state inside a base query (e.g., to retrieve the auth token), cast `getState()` inline safely:
```typescript
const token = (getState() as { auth: { token: string | null } }).auth?.token;
```
