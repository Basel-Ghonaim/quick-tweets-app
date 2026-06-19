# Working Principles & Patterns

> The principles, patterns, and conventions we follow across **both frontend and backend** in this project.
> Use this as a reference when contributing, reviewing, or when providing AI context in new conversations.

---

## 1. SOLID Principles

The five SOLID principles are the foundation of every architectural decision in this project — frontend and backend alike.

### S — Single Responsibility Principle

> Every file, function, and module should have **one reason to change**.

Each unit of code does exactly one job. If it does two things, split it.

| Layer | Frontend Example | Backend Example |
|---|---|---|
| **Hook / Service** | `useAvatarFile` — only manages file state, preview, and drag events | `AuthService` — only handles login/register/logout business logic |
| **Component / Controller** | `AvatarEmpty` — only renders the empty state UI | `AuthController` — only parses the request and sends the response |
| **Validator** | `validateDropzoneFiles` — only validates file type and size | `registerSchema` (Zod) — only validates registration input |
| **Repository** | `restAuth` — only makes HTTP calls to the auth API | `UserRepository` — only executes database queries for users |

**Why it matters:** When a bug appears in password hashing, you know it's in `AuthService` — not scattered across controllers and routes.

---

### O — Open/Closed Principle

> The system should be **extendable without modifying existing code**.

New features are added by creating new files — not by editing existing ones.

| Scenario | Frontend Example | Backend Example |
|---|---|---|
| **New variant** | Add `avatarRectangle` CSS class — don't edit `avatarCircle` | Add `GoogleAuthProvider` — don't edit `LocalAuthProvider` |
| **New validator** | Add `isPhoneNumber()` to `validators/` — don't edit existing validators | Add `postSchema` to `validators/` — don't edit `registerSchema` |
| **New error type** | Add a new error `type` to `AppError` union — existing handlers still work | Add `RateLimitError` — existing error middleware catches it automatically |

**Rule of thumb:** If you're adding `else if` blocks to an existing function, you're violating OCP. Use a map, a switch, or a new file instead.

---

### L — Liskov Substitution Principle

> Any implementation can be **swapped for another** that fulfills the same interface.

If code depends on an interface, any concrete implementation of that interface must work without the consumer knowing.

| Interface | Implementation A | Implementation B (swap) |
|---|---|---|
| **Frontend:** `AuthRepository` | `restAuth` (Axios → tarmeez API) | `restAuth` (Axios → our Express backend) |
| **Backend:** `IUserRepository` | `PrismaUserRepository` (PostgreSQL) | `MongoUserRepository` (MongoDB) |
| **Backend:** `IStorageService` | `LocalStorageService` (disk) | `S3StorageService` (AWS S3) |

**Real project example:** When the tarmeez API was disabled, we only need to change `baseURL` in `client.ts` — the entire frontend (hooks, components, store) works unchanged because it depends on `AuthRepository` interface, not on the concrete API URL.

---

### I — Interface Segregation Principle

> Interfaces expose **only what consumers need**. No more.

Don't force a component/service to depend on props/methods it doesn't use.

| Frontend Example | Backend Example |
|---|---|
| `AvatarEmpty` receives only `fill: AvatarFill` — not the entire FileInputProps | `AuthController` receives only `AuthService` — not the database client |
| `AvatarOverlay` receives only `onDelete` + `onReplace` — not the file object | Route handler receives only `req.body` parsed by Zod — not the raw Express request in the service |
| Barrel exports (`index.ts`) control what's public from each directory | Service interfaces expose only `login()`, `register()`, `logout()` — not internal helpers |

**Anti-pattern:** A function that takes 15 parameters when it only uses 3. Split the interface.

---

### D — Dependency Inversion Principle

> High-level logic depends on **abstractions (interfaces)**, not on concrete implementations.

The "important" code (business logic, hooks) never imports "infrastructure" code (Axios, Prisma, localStorage) directly.

```
Frontend:                              Backend:
Component                              Controller
  → Hook                                 → Service (interface)
    → Repository (interface)                → Repository (interface)
      → Axios (concrete)                      → Prisma (concrete)
```

| What depends on what | Frontend | Backend |
|---|---|---|
| **Hook / Service** depends on | `AuthRepository` interface | `IUserRepository` interface |
| **Repository** concrete uses | `apiClient` (Axios) | `prisma.user` (Prisma Client) |
| **Can we swap?** | ✅ Change Axios → Fetch without touching hooks | ✅ Change Prisma → raw SQL without touching services |

**Real project example:** `useAuthFlow` hook calls `login()` from the repository. It doesn't know if that's REST, GraphQL, or a mock — it just calls the interface method.

---

## 2. Data Layer Patterns

These patterns ensure the API contract never leaks into domain logic — both frontend and backend.

### DTO — Data Transfer Object

> The **exact shape of data on the wire** — what the API sends/receives.

- Frontend DTOs match the backend's response shape (often snake_case)
- Backend DTOs match the client's request shape (validated by Zod)

```
Frontend DTO:  { user_name: "john", profile_image: "url" }  ← from API
Backend DTO:   { username: "john", password: "***" }         ← from client request
```

### Entity

> The **domain model** used inside the application. Decoupled from API shape.

```
Frontend Entity:  { username: "john", profileImage: "url" }  ← camelCase, clean
Backend Entity:   User { id, username, name, email, passwordHash, profileImage }  ← DB model
```

### Mapper

> Pure transformation functions that convert between **DTO ↔ Entity**.

```typescript
// Frontend: API response → domain entity
const toUser = (dto: UserDto): User => ({
  username: dto.user_name,
  profileImage: dto.profile_image,
});

// Backend: domain entity → API response
const toUserResponse = (user: User): UserResponseDto => ({
  id: user.id,
  username: user.username,
  profile_image: user.profileImage,
});
```

**Rule:** If the backend renames `profile_image` to `avatar_url`, only the mapper changes — zero component/service changes.

### Repository

> An **interface** defining data access operations. A concrete implementation fulfills it.

```typescript
// Frontend                              // Backend
interface AuthRepository {               interface IUserRepository {
  login(creds): Promise<AuthResponse>      findByUsername(username): Promise<User | null>
  register(creds): Promise<AuthResponse>   create(data): Promise<User>
  logout(): Promise<void>                  findById(id): Promise<User | null>
}                                        }
```

---

## 3. Architectural Patterns (Shared)

### Factory Pattern

> Instances are created via **factory functions**, not classes or `new`.

```typescript
// Frontend
export const restAuth = (api = apiClient): AuthRepository => ({ ... });

// Backend
export const createAuthService = (repo = userRepository): AuthService => ({ ... });
```

**Why:** Enables dependency injection via default parameters, easy testing with mocks.

### Error Normalization

> All errors from any source are funneled into a **single typed error shape**.

```typescript
// Frontend: AppError { type, message, status, errors? }
// Backend:  AppError { type, message, statusCode, errors? }
```

Both sides use the same error taxonomy:

| Error Type | Frontend Source | Backend Source |
|---|---|---|
| `validation` | Schema form validation | Zod request validation |
| `unauthorized` | 401 from API | Invalid JWT / wrong password |
| `not_found` | 404 from API | User not found in DB |
| `server` | 500 from API | Unhandled exception |
| `network` | Axios/Fetch network error | — |

### Interceptor Pattern (Frontend) / Middleware Pattern (Backend)

> Cross-cutting concerns handled in **one place**, not repeated in every call.

| Concern | Frontend (Interceptor) | Backend (Middleware) |
|---|---|---|
| **Auth token** | Request interceptor adds `Authorization: Bearer` | `authGuard` middleware verifies JWT |
| **Error handling** | Response interceptor normalizes Axios errors | `errorHandler` middleware catches and formats all errors |
| **Logging** | — | `requestLogger` middleware logs method + path + duration |

### Clean Architecture (per module)

> Each feature module is internally layered. Dependencies flow **inward**.

```
Frontend module:                        Backend module:
types → entity → dto → mapper →         types → entity → dto → mapper →
repository → services → config →        repository → service →
store → hooks → components → pages      validator → controller → routes
```

**Rule:** A component never imports from `repository/`. A controller never imports from `prisma/`. Each layer talks only to the layer below it.

---

## 4. Frontend-Specific Patterns

### Schema-Driven Forms (SBE)

Forms are driven by a **single schema configuration object**. The engine automatically produces initial state, real-time validation, error tracking, and a fully typed submission payload.

```typescript
const loginFields = {
  username: { type: "text", validators: [isRequired(), isLengthChecked()] },
  password: { type: "password", validators: [isRequired()] },
};
// → auto-generates: values, errors, handleChange, handleSubmit
```

### Request State Machine

Server request status is modeled as a **finite state** — not scattered booleans:

```
idle → loading → success
                → error
```

### CSS Design Tokens

All visual properties are defined as **CSS custom properties**. Components reference tokens, never hardcoded values:

```css
/* ✅ Correct */
color: var(--color-primary-primary);
gap: var(--space-2);

/* ❌ Wrong */
color: #3b82f6;
gap: 8px;
```

### CSS Modules

Every component uses **scoped `.module.css` files** — no global collisions, styles live next to their component.

### Dynamic CSS Variables

Design system components inject CSS variables at runtime via inline styles:

```tsx
style={{ "--file-input-color": "var(--color-success-primary)" }}
```

This avoids generating a new CSS class for every color × variant combination.

### Feature-Sliced Architecture

```
app/      → wiring (store, router, providers)
modules/  → feature domains (auth, posts, comments)
shared/   → zero domain knowledge (design-system, api, errors, types)
```

### Barrel Exports

Every directory has an `index.ts` that controls its **public API**:

```typescript
// ✅ Consumer imports from barrel
import { AuthPage } from "../modules/auth";

// ❌ Never import internal files
import { AuthPage } from "../modules/auth/pages/AuthPage";
```

---

## 5. Backend-Specific Patterns

### Layered Request Flow

```
Client Request
  → Route (path definition)
    → Middleware (auth guard, validation)
      → Controller (parse req, call service, send res)
        → Service (business logic, rules)
          → Repository (database queries)
            → Database (PostgreSQL via Prisma)
```

### Zod Request Validation

Every endpoint validates input with **Zod schemas** before the controller sees it:

```typescript
const registerSchema = z.object({
  username: z.string().min(4).max(20),
  password: z.string().min(8).max(16),
  email: z.string().email(),
  name: z.string().min(1),
});
// Middleware validates → Controller receives typed, safe data
```

### JWT Auth Flow

```
Register/Login → Server creates JWT (access + refresh)
  → Client stores token → Sends in Authorization header
    → authGuard middleware verifies → passes userId to controller
```

### Password Hashing

Passwords are **never stored in plain text**. `bcrypt` hashes on register, compares on login:

```typescript
// Register
const hash = await bcrypt.hash(password, 12);

// Login
const isMatch = await bcrypt.compare(password, user.passwordHash);
```

### File Upload (Multer)

Profile images and media are handled by **Multer middleware** — the controller receives the file path, not the raw stream.

---

## 6. TypeScript Conventions (Shared)

### Conditional Type Inference

Generic types map **configuration to runtime types**:

```typescript
type FieldValue<T> = T extends "checkbox" ? boolean
                   : T extends "file" ? File | null
                   : string;
```

### `satisfies` Operator

Schema configs use `satisfies` to **validate shape without widening the type**:

```typescript
const loginFields = {
  username: { type: "text", ... },
} satisfies Record<string, FormFieldConfig>;
```

### Generic Error Payloads

Error classes use discriminated generics so `errors` is **narrowed by error type**:

```typescript
type AppError<T> = T extends "validation"
  ? { errors: Record<string, string[]> }
  : { errors?: unknown };
```

---

## 7. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| **Files** | camelCase | `authMapper.ts`, `useAuthFlow.ts` |
| **Components** | PascalCase | `LoginForm.tsx`, `AvatarOverlay.tsx` |
| **CSS Modules** | ComponentName.module.css | `FileInput.module.css` |
| **Interfaces** | PascalCase, prefix `I` for backend repos | `AuthRepository`, `IUserRepository` |
| **Types** | PascalCase | `LoginCredentials`, `FileInputColor` |
| **Constants** | UPPER_SNAKE_CASE | `VALIDATION_MESSAGES` |
| **Backend routes** | kebab-case | `/auth/login`, `/posts/:id/comments` |
| **DB tables** | snake_case (Prisma handles mapping) | `users`, `profile_image` |
| **Branches** | type/description | `feature/ds-avatar`, `fix/navigation-auth-pages` |
| **Commits** | conventional commits | `feat(auth):`, `fix(auth):`, `style(design-system):` |
