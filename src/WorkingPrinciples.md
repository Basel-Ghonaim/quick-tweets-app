# Working Principles & Patterns

> The principles, patterns, and conventions we follow across this project. Use this as a reference when contributing or when providing AI context in new conversations.

---

## SOLID Principles

### SRP — Single Responsibility Principle
Every file, function, and module should have **one reason to change**. A mapper only maps. A service only handles one domain concern. A hook only orchestrates one flow.

### OCP — Open/Closed Principle
The system should be **extendable without modifying existing code**. New validators, error types, or design tokens are added — never edited into existing logic.

### LSP — Liskov Substitution Principle
Any implementation can be **swapped for another** that fulfills the same interface without breaking consumers. A REST repository can be replaced by a GraphQL one transparently.

### ISP — Interface Segregation Principle
Interfaces expose **only what consumers need**. Internal details are hidden. Barrel files (`index.ts`) control the public API surface of every directory.

### DIP — Dependency Inversion Principle
High-level logic depends on **abstractions (interfaces)**, not on concrete implementations. Hooks consume repository interfaces; they never import Axios or localStorage directly.

---

## Data Layer Patterns

### DTO — Data Transfer Object
DTOs represent the **exact shape of data on the wire** — what the API sends and receives. They match the backend contract (e.g., snake_case field names) and contain no business logic.

### Entity
Entities represent the **domain model** used inside the application. They use camelCase and are completely decoupled from the API shape. If the backend renames a field, only the mapper changes.

### Mapper
Mappers are pure transformation functions that convert between **DTO ↔ Entity**. They isolate the API contract from the rest of the app so that backend changes never leak into domain logic.

### Repository
A repository is an **interface** defining data access operations (e.g., login, register, fetch). A concrete implementation (e.g., REST via Axios) fulfills that interface. This enables transport swapping and easy test mocking.

---

## Architectural Patterns

### Factory Pattern
Instances are created via **factory functions** (not classes or `new`). This keeps things functional, enables dependency injection via default parameters, and makes testing straightforward.

### Interceptor Pattern
Cross-cutting concerns (token injection, error normalization, session cleanup on 401) are handled via **HTTP interceptors** — not repeated in every API call.

### Error Normalization
All errors from any source (Axios, native, unknown) are funneled into a **single typed error class** (`AppError`). Every layer of the app can rely on a consistent error shape with a `type`, `message`, `status`, and optional `errors` payload.

### Clean Architecture (per module)
Each feature module is internally layered: `types → entity → dto → mapper → repository → services → config → store → hooks → components → pages`. Dependencies flow inward — UI depends on hooks, hooks depend on services, services depend on abstractions.

---

## React & State Patterns

### Schema-Driven Forms (SBE)
Forms are driven by a **single schema configuration object**. The engine automatically produces initial state, real-time validation, error tracking, and a fully typed submission payload — zero repetition per form.

### Request State Machine
Server request status is modeled as a **finite state** (`idle → loading → success | error`) with a typed error slot — not as scattered boolean flags.

### Typed Redux Hooks
Pre-typed `useAppDispatch` and `useAppSelector` hooks eliminate manual type annotations in every component that touches the store.

### `useLatest` Ref Pattern
A ref-based pattern that always holds the **most recent value** without causing `useCallback` dependencies to change — preventing stale closures and unnecessary re-renders.

### Hook Composition / Facade
Complex internal logic (form engine + Redux dispatch + request state) is composed inside private hooks and exposed as a **single, simple public hook** with a flat return type. Components never see Redux, Axios, or localStorage.

---

## CSS & Design System

### Design Tokens
All visual properties (colors, spacing, typography, borders, shadows, transitions) are defined as **CSS custom properties** in a centralized token layer. Components reference tokens — never hardcoded values.

### Semantic Theming
Theme-specific values (surfaces, text, borders) are **semantic aliases** pointing to primitive tokens. A `[data-theme="dark"]` selector overrides these aliases — enabling theme switching with zero component changes.

### CSS Modules
Every component uses **scoped `.module.css` files**, preventing global style collisions and keeping styles co-located with their component.

### Dynamic CSS Variables
Design system components inject **CSS variables at runtime** via inline styles based on props (e.g., `color`, `variant`). This avoids generating a new CSS class for every color combination.

---

## Code Organization

### Feature-Sliced Architecture
Code is organized into **three strict layers**: `app` (wiring — store, router, providers), `modules` (feature domains), and `shared` (zero domain knowledge — pure reusable infrastructure).

### Barrel Exports
Every directory has an `index.ts` that explicitly controls its **public API**. Internal files are never exported. Consumers always import from the barrel, preventing deep coupling.

---

## TypeScript Conventions

### Conditional Type Inference
Generic conditional types map **configuration strings to runtime value types** (e.g., field type `"checkbox"` → `boolean`, `"file"` → `File | null`). This propagates full type safety from schema definition to submission payload.

### `satisfies` Operator
Schema configs use `satisfies` to **validate shape compliance without widening the type**, preserving literal inference for downstream generics.

### Generic Error Payloads
Error classes use discriminated generics so that the `errors` payload is **narrowed based on the error type** (e.g., `"validation"` → `Record<string, string[]>`, others → `unknown`).
