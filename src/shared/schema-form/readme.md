# `@shared/schema-form` — Schema-Driven Form Engine

![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square&logo=typescript)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=flat-square)
![React](https://img.shields.io/badge/React-18%2B-61dafb?style=flat-square&logo=react)

A production-grade, zero-dependency, type-safe form engine for React. Built from scratch with a **Schema-Driven** architecture, it eliminates boilerplate by inferring your entire form state, error map, and value types directly from a single configuration object.

---

## 📋 Table of Contents

| # | Section |
|---|---------|
| 1 | [Core Philosophy](#1-core-philosophy) |
| 2 | [Project Structure](#2-project-structure) |
| 3 | [Architecture Flow](#3-architecture-flow) |
| 4 | [TypeScript Implementation](#4-typescript-implementation) |
| 5 | [Step-by-Step Usage](#5-step-by-step-usage) |
| 6 | [API Reference](#6-api-reference) |
| 7 | [Decision Log](#7-decision-log) |
| 8 | [Future Roadmap](#8-future-roadmap) |

---

## 1. Core Philosophy

### Why did we design it this way?

Most form solutions fall into one of two failure modes:

| Approach | Problem |
|---|---|
| Raw `useState` per field | Infinite boilerplate. Every new form duplicates `value`, `error`, `onChange`, and `onSubmit` logic. |
| Heavy libraries (`react-hook-form`, `Formik`) | Opaque internals, large bundle sizes, and rigid APIs that fight against custom architectures. |
| **Schema-Driven Engine (ours)** | ✅ Zero external dependencies. ✅ Fully inferred types. ✅ One config object drives everything. |

The guiding principle is **"Describe the form once, get everything for free."**  
You define a `schema` object. The engine automatically produces: initial state, validation pipeline, error tracking, loading state, and a type-safe submission payload — with zero repetition.

> ⚙️ **Design Principles**
> - **Zero Dependencies:** No `zod`, no `react-hook-form`. Native TypeScript and React only.
> - **Domain-Driven Design:** Types (Model), Services (Logic), and Hook (Controller) are strictly separated.
> - **Generic First:** The engine has zero knowledge of "Auth", "Login", or any specific domain. It is a pure tool.
> - **Performance by Default:** `useCallback`, lazy `useState`, and the `useLatest` pattern prevent unnecessary re-renders by default.

---

## 2. Project Structure

```
src/shared/schema-form/
│
├── hooks/
│   └── useSchemaForm.ts          # 🎮 The Controller. Manages state, events, and submission.
│
├── types/
│   └── schema.types.ts           # 📐 The Model. All generic types and inference engine live here.
│
├── services/
│   ├── index.ts                  # Barrel export for all services
│   ├── buildInitialFormState.ts  # 🏗️ Builds the initial state object from the schema.
│   ├── executeFieldValidators.ts # ✅ Runs a single field's validator array. Returns first error.
│   └── validateSchemaForm.ts     # 🔍 Sweeps the entire schema. Used as pre-flight before submit.
│
├── validators/
│   └── coreValidators.ts         # 📦 Re-usable, composable validator factory functions.
│
└── readme.md                     # You are here
```

### File Responsibilities

| File | Layer | Responsibility |
|---|---|---|
| `schema.types.ts` | **Model** | Defines all generic types. Nothing else imports into this file. |
| `buildInitialFormState.ts` | **Service** | Pure function. Schema in → `FormState` out. No React. |
| `executeFieldValidators.ts` | **Service** | Pure function. Runs validators sequentially. Returns first error or `null`. |
| `validateSchemaForm.ts` | **Service** | Pure function. Sweeps all fields. Returns `{ isValid, errors }`. |
| `coreValidators.ts` | **Validators** | Factory functions returning `ValidatorFn`. Composable and testable. |
| `useSchemaForm.ts` | **Controller** | The only React file. Wires state, services, and DOM events together. |

---

## 3. Architecture Flow

### Initialization

```
Schema Config Object
      │
      ▼
buildInitialFormState(schema)
      │
      ▼
FormState<TSchema> = {
  values:      { [key]: initialValue }   ← Inferred from FieldType
  errors:      { [key]: null }           ← All clean on mount
  isSubmitting: false
}
```

### On Every Keystroke (`handleChange`)

```
DOM Event (onChange)
      │
      ├─── Extract { name, value, el }
      │
      ├─── Determine schemaType from schema[fieldName]
      │
      ├─── switch(schemaType) → resolve fieldValue
      │         ├── "checkbox" | "radio" → el.checked (boolean)
      │         ├── "file"               → File | File[] | null
      │         ├── "number"             → Number(el.value) | ""
      │         └── default              → string value
      │
      ├─── executeFieldValidators(fieldValue, nextValues, validators)
      │         └── Returns: string (error) | null (valid)
      │
      └─── setState({ values: nextValues, errors: { [field]: error } })
```

### On Submit (`handleSubmit`)

```
Form onSubmit
      │
      ├─── validateSchemaForm(schema, latestValues.current)
      │         └── Sweeps ALL fields → { isValid, errors }
      │
      ├─── if (!isValid) → setState({ errors }) → STOP
      │
      ├─── setState({ isSubmitting: true })
      │
      ├─── await onSubmitAction(currentValues)
      │         ├── SUCCESS → falls through to finally
      │         └── CATCH   → onError(err) ?? console.error(...)
      │
      └─── finally → setState({ isSubmitting: false })
```

---

## 4. TypeScript Implementation

### The Type Inference Engine

The entire system is driven by a single conditional type that maps a field's `type` string to its JavaScript memory type.

```typescript
// types/schema.types.ts

export type FieldType =
  | "text" | "password" | "email"
  | "checkbox" | "radio"
  | "file" | "number"
  | "select" | "textarea";
```

```typescript
// The Inference Engine: Maps FieldType → JavaScript value type
export type FieldValue<T extends FieldType = FieldType> = T extends
  | "checkbox" | "radio"
  ? boolean
  : T extends "file"
    ? File | File[] | null
    : T extends "number"
      ? number | ""
      : string;
```

```typescript
// FormValue<T>: Infers the entire payload shape from the schema
export type FormValue<T extends Record<string, FormFieldConfig<FormPayload>>> = {
  [K in keyof T]: FieldValue<T[K]["type"]>;
};
```

> 📌 **How inference works:**  
> If a schema field has `type: "checkbox"`, then `FormValue` automatically types that key as `boolean`.  
> If `type: "number"`, it becomes `number | ""`. If `type: "file"`, it becomes `File | File[] | null`.  
> This propagates all the way to `onSubmitAction`, giving you a fully typed payload with zero manual annotation.

### The `FormState` Interface

```typescript
export interface FormState<T extends Record<string, FormFieldConfig<FormPayload>>> {
  values:       FormValue<T>;                  // Fully typed value map
  errors:       Record<keyof T, string | null>; // Error per field
  isSubmitting: boolean;                        // Submission loading state
}
```

### The `ValidatorFn` Signature

```typescript
// Validators receive the current field value AND the entire form state,
// enabling cross-field validation (e.g., password confirmation).
export type ValidatorFn = (
  value: FieldValue,
  values: FormPayload,
) => string | null;
```

---

## 5. Step-by-Step Usage

### Step 1 — Define your payload interface

```typescript
// modules/my-feature/types/myForm.types.ts
export interface MyFormCredentials {
  username: string;
  age:      number | "";
  agree:    boolean;
}
```

### Step 2 — Define your schema

```typescript
// modules/my-feature/config/myFormSchema.ts
import type { FormFieldConfig } from "@shared/schema-form/types/schema.types";
import { isRequired, isLengthChecked } from "@shared/schema-form/validators/coreValidators";
import type { MyFormCredentials } from "../types/myForm.types";

export const myFormSchema: Record<keyof MyFormCredentials, FormFieldConfig<MyFormCredentials>> = {
  username: {
    name:       "username",
    type:       "text",
    label:      "Username",
    placeholder: "Enter your username",
    validators: [isRequired(), isLengthChecked({ min: 3 })],
  },
  age: {
    name:  "age",
    type:  "number",
    label: "Age",
  },
  agree: {
    name:       "agree",
    type:       "checkbox",
    label:      "I agree to the Terms",
    validators: [isRequired("You must agree to continue")],
  },
};
```

### Step 3 — Wire the hook into your component

```tsx
// modules/my-feature/components/MyForm.tsx
import { useSchemaForm } from "@shared/schema-form/hooks/useSchemaForm";
import { myFormSchema } from "../config/myFormSchema";

const MyForm = () => {
  const { values, errors, isSubmitting, handleChange, handleSubmit } = useSchemaForm(
    myFormSchema,
    async (payload) => {
      // payload is fully typed as MyFormCredentials ✅
      await api.post("/submit", payload);
    },
    (err) => {
      // Optional: your custom error handler
      toast.error("Submission failed!");
    },
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        type="text"
        value={values.username}
        onChange={handleChange}
        placeholder="Enter your username"
      />
      {errors.username && <span>{errors.username}</span>}

      <input
        name="agree"
        type="checkbox"
        checked={values.agree}
        onChange={handleChange}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
};
```

> ⚠️ **Common Pitfall**  
> Always ensure the `name` attribute on your HTML element **exactly matches** the key in your schema object.  
> The engine uses `e.target.name` as the lookup key. A typo here will cause the field update to be silently ignored.

---

## 6. API Reference

### `useSchemaForm` Hook

```typescript
const formApi = useSchemaForm(schema, onSubmitAction, onError?)
```

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schema` | `Record<string, FormFieldConfig<FormPayload>>` | ✅ Yes | The schema configuration object that drives the entire form. |
| `onSubmitAction` | `(values: FormValue<TSchema>) => Promise<void>` | ✅ Yes | Async function called with the fully-typed payload after successful pre-flight validation. |
| `onError` | `(err: unknown) => void` | ❌ Optional | Custom error interceptor. If omitted, errors are logged to `console.error`. |

#### Return Value

| Property | Type | Description |
|---|---|---|
| `values` | `FormValue<TSchema>` | The current typed form values. Spread directly into your input `value` props. |
| `errors` | `Record<keyof TSchema, string \| null>` | Per-field error strings. `null` means the field is valid. |
| `isSubmitting` | `boolean` | `true` while `onSubmitAction` is in flight. Use to disable submit buttons. |
| `handleChange` | `ChangeEventHandler<HTMLInputElement \| HTMLSelectElement \| HTMLTextAreaElement>` | Attach to `onChange` on any native HTML form element. |
| `handleSubmit` | `FormEventHandler<HTMLFormElement>` | Attach to `onSubmit` on the `<form>` element. |

### `FormFieldConfig` Schema Shape

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `keyof TPayload` | ✅ Yes | Must match the key in your payload interface. Used for type inference. |
| `type` | `FieldType` | ✅ Yes | Drives initial value, DOM extraction, and TypeScript type inference. |
| `label` | `string` | ✅ Yes | Human-readable label for the field. |
| `placeholder` | `string` | ❌ Optional | Placeholder text for input elements. |
| `validators` | `ValidatorFn[]` | ❌ Optional | Array of validator factory results. Executed in order; first error wins. |

### `FieldType` → `FieldValue` Map

| `FieldType` | Inferred `FieldValue` | HTML Element |
|---|---|---|
| `"text"` | `string` | `<input type="text">` |
| `"password"` | `string` | `<input type="password">` |
| `"email"` | `string` | `<input type="email">` |
| `"checkbox"` | `boolean` | `<input type="checkbox">` |
| `"radio"` | `boolean` | `<input type="radio">` |
| `"file"` | `File \| File[] \| null` | `<input type="file">` |
| `"number"` | `number \| ""` | `<input type="number">` |
| `"select"` | `string` | `<select>` |
| `"textarea"` | `string` | `<textarea>` |

### Core Validators (`coreValidators.ts`)

| Validator | Signature | Description |
|---|---|---|
| `isRequired` | `isRequired(message?)` | Fails on empty strings, `null`, `undefined`, and `false`. |
| `isEmailFormat` | `isEmailFormat(message?)` | Validates standard email regex. |
| `isLengthChecked` | `isLengthChecked(minLength?, maxLength?)` | Validates string character boundaries. |
| `isMatch` | `isMatch(targetField, message?)` | Cross-field equality check. Reads `values[targetField]`. |

---

## 7. Decision Log

This section documents *why* key technical decisions were made.

### Why `useLatest` for `handleSubmit`?

Without `useLatest`, `state.values` would be a dependency of `useCallback`, causing `handleSubmit` to be **re-created on every keystroke**. While functionally safe, this destroys memoization for any child components receiving `handleSubmit` as a prop.

`useLatest` stores the latest values in a `useRef`, synchronized after every committed render via `useEffect`. The callback reads `latestValues.current` at the moment of the click, guaranteeing fresh data without triggering closure recalculation.

> ⚡ **Performance Tip**  
> `useLatest` guarantees `handleSubmit` is compiled **exactly once**. This is essential if you ever wrap your form's submit button in `React.memo`.

### Why `onError?` instead of silent `catch {}` or pure `finally`?

| Approach | Problem |
|---|---|
| `catch {}` (silent) | Swallows errors invisibly. Breaks Sentry, Datadog, and any crash analytics. |
| `try/finally` (no catch) | Errors bubble out as `Uncaught (in promise)` warnings in the console, causing false alarms in monitoring tools. |
| `onError?: (err) => void` ✅ | Consumer decides. Redux layer? Pass your Toast handler. Simple form? Get a clean `console.error` tag. |

### Why are services pure functions (no React)?

`buildInitialFormState`, `executeFieldValidators`, and `validateSchemaForm` contain zero React imports. This means they are **directly unit-testable** with `vitest` or `jest` — no JSDOM, no component mocking required.

```bash
# Test the validation pipeline in complete isolation:
expect(executeFieldValidators("", {}, [isRequired()])).toBe("This field is required");
```

---

## 8. Future Roadmap

Recommended improvements for future iterations of this engine:

| Priority | Feature | Description |
|---|---|---|
| 🔴 High | **`SchemaFormRenderer` Component** | A "dumb" iterator that maps the schema to rendered inputs automatically. Eliminates manual `input` wiring in every consumer component. |
| 🔴 High | **Unit Test Suite** | Test `executeFieldValidators`, `validateSchemaForm`, and `buildInitialFormState` in full isolation. |
| 🟡 Medium | **`setFieldValue` API** | A programmatic way to update field values from outside the DOM (e.g., setting a value from an API response on mount). |
| 🟡 Medium | **`resetForm` API** | Re-initialize the form state back to `buildInitialFormState(schema)`. Useful for multi-step forms or post-submit resets. |
| 🟡 Medium | **`isDirty` Flag** | Track whether any field has been modified from its initial value. Power "Unsaved Changes" warnings. |
| 🟢 Low | **Async Validators** | Allow `ValidatorFn` to return `Promise<string \| null>` for server-side uniqueness checks (e.g., username availability). |
| 🟢 Low | **`watch` API** | Subscribe to specific field changes without full re-renders, similar to `react-hook-form`'s `watch`. |
| 🟢 Low | **Zod/Yup Adapter** | An optional adapter layer that converts a Zod or Yup schema into the `FormFieldConfig[]` format. |

> 📌 **Architectural Note**  
> Before adding `setFieldValue` or `resetForm`, ensure they are implemented as **stable callbacks** using the same `useCallback` pattern as `handleChange`. Unstable function references at the API boundary will cause silent performance regressions in memoized trees.
