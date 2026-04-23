# RightPanel — UI Integration Changelog

> Tracks all modifications and additions made during the LoginForm ↔ Hook Layer integration.

---

## Step 1: Add `errorMessage` support to DS Input component

### Modified Files

| File                                                     | Change                                                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `shared/design-system/components/Input/Input.types.ts`   | Added `errorMessage?: string` prop                                                                             |
| `shared/design-system/components/Input/Input.tsx`        | Renders error message below input when `isInvalid && errorMessage`, added `aria-describedby` for accessibility |
| `shared/design-system/components/Input/Input.module.css` | Added `.errorMessage` style matching the Checkbox error pattern                                                |

### Why

The `Checkbox` DS component already supports `errorMessage`, but `Input` did not. Both components need consistent error display for the schema-driven form renderer to work uniformly.

---

## Step 2: Create SchemaField renderer component

### New Files

| File                                                 | Purpose                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `shared/schema-form/components/SchemaField.types.ts` | Props interface — accepts `name`, `type`, `label`, `placeholder`, `value`, `error`, `onChange` |
| `shared/schema-form/components/SchemaField.tsx`      | Generic renderer that maps `FieldType` to the correct DS component (`Input` or `Checkbox`)     |

### Modified Files

| File                          | Change                                             |
| ----------------------------- | -------------------------------------------------- |
| `shared/schema-form/index.ts` | Added `SchemaField` and `SchemaFieldProps` exports |

### Why

Instead of hand-writing `<Input>` for every field in every form, `SchemaField` reads the field's `type` from the schema config and renders the correct DS component automatically. This eliminates repetition and ensures consistent error display, accessibility, and styling across all forms.

---

## Step 3: Wire LoginForm to useLoginFlow

### Modified Files

| File | Change |
|---|---|
| `modules/auth/components/RightPanel/AuthForm/LoginForm.tsx` | Replaced raw HTML with `useLoginFlow` hook + `SchemaField` mapping + DS `Button` with loading state + server error banner |
| `modules/auth/components/RightPanel/AuthForm/AuthForm.module.css` | Removed raw `.field`, `.label`, `.input`, `.checkbox` styles (now handled by DS). Added `.serverError` banner. Simplified `.submit` to spacing-only override. |

### What LoginForm now does:
1. Calls `useLoginFlow()` → gets `values`, `errors`, `isSubmitting`, `handleChange`, `handleSubmit`, `isError`, `serverError`
2. Maps over `authFormSchemas.loginFields` → renders `<SchemaField>` for each field
3. Shows `serverError.message` banner when `isError && serverError`
4. Uses DS `<Button>` with `state="loading"` + `loadingText` during submission
5. Keeps `<OAuthButtons>` at the bottom

---

## Step 4: Wire RegisterForm to useRegisterFlow

### Modified Files

| File | Change |
|---|---|
| `modules/auth/components/RightPanel/AuthForm/RegisterForm.tsx` | Replaced raw HTML with `useRegisterFlow` hook + `SchemaField` mapping + DS `Button` with loading state + server error banner |

### What RegisterForm now does:
1. Calls `useRegisterFlow()` → gets `values`, `errors`, `isSubmitting`, `handleChange`, `handleSubmit`, `isError`, `serverError`
2. Maps over `authFormSchemas.registerFields` → renders `<SchemaField>` for each field (name, username, password, email, confirmPassword, privacy, profileImage)
3. Shows `serverError.message` banner when `isError && serverError`
4. Uses DS `<Button>` with `state="loading"` + `loadingText="Creating account…"` during submission
5. Keeps `<OAuthButtons>` at the bottom

### Note:
- `profileImage` currently renders as a basic `<Input type="file">` via SchemaField's fallback
- When the `FileInput` DS component is built, update `SchemaField`'s `case "file"` → `<FileInput>` and RegisterForm gets it automatically — zero changes to this file
