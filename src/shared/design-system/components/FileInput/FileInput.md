# FileInput Component

## Part 1: What It Does

A multi-variant file upload component for the design system. Replaces the native `<input type="file">` with styled, accessible, and feature-rich alternatives.

### Variants

| Variant | Description | Use Case |
|---|---|---|
| `standard` | Button + file name display (like a text input) | CV upload, document attachment |
| `dropzone` | Large dashed-border box with drag & drop | Bulk file uploads |
| `avatar` | Circular or rectangular image preview | Profile pictures, product images |

### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | **required** | Field name for form integration |
| `label` | `string` | — | Label rendered above the input |
| `variant` | `"standard" \| "dropzone" \| "avatar"` | `"standard"` | Visual variant |
| `avatarShape` | `"circle" \| "rectangle"` | `"circle"` | Avatar shape (only for avatar variant) |
| `value` | `File \| File[] \| null` | — | Controlled file value |
| `onChange` | `(files) => void` | — | Called when file(s) are selected |
| `onRemove` | `(file) => void` | — | Called when a file is removed |
| `accept` | `string` | — | Accepted file types (e.g. `"image/*"`) |
| `maxSize` | `number` | — | Max file size in bytes |
| `multiple` | `boolean` | `false` | Allow multi-file selection |
| `isInvalid` | `boolean` | `false` | Marks input as invalid |
| `errorMessage` | `string` | — | Error text shown when invalid |
| `disabled` | `boolean` | `false` | Disables the input |
| `helperText` | `string` | — | Helper text (e.g. "PNG, JPG up to 5MB") |
| `color` | `FileInputColor` | `"primary"` | Color theme |
| `fullWidth` | `boolean` | `false` | Stretch to fill container |
| `className` | `string` | — | Additional CSS class |
| `children` | `ReactNode` | — | Custom trigger content (Standard variant) |

### Related Types

| Type | Values |
|---|---|
| `FileInputVariant` | `"standard" \| "dropzone" \| "avatar"` |
| `AvatarShape` | `"circle" \| "rectangle"` |
| `FileInputColor` | `"primary" \| "secondary" \| "success" \| "warning" \| "error" \| "info"` |
| `FileItemStatus` | `"idle" \| "uploading" \| "success" \| "error"` |
| `FileItem` | `{ id, file, preview?, status, progress, error? }` |

---

## Part 2: How We Built It

### Step 1.1 — Types & Interfaces
**Files:** `FileInput.types.ts`

Defined the complete type contract before writing any runtime code:
- `FileInputVariant`, `AvatarShape` — variant and shape unions
- `FileItemStatus`, `FileItem` — future multi-file state (Phase 4)
- `FileInputColor` — same color union as Input and Checkbox
- `FileInputProps` — full prop interface following DS patterns (color, isInvalid, errorMessage, disabled, fullWidth)

**Principle:** Types-first design — the contract is the blueprint before any implementation.

### Step 1.2 — Component Shell
**Files:** `FileInput.tsx`, `FileInput.module.css`, `FileInput.stories.tsx`, `index.ts`

Created the component structure:
- `forwardRef` wrapper with `useId` for accessible label-input linking
- Class builder pattern (array → filter → join) matching Input and Checkbox
- `renderVariant()` switch returning placeholders per variant
- CSS module with container, label, error, disabled, and placeholder styles
- Stories file with one story per variant + state stories
- Barrel export registered in the DS `components/index.ts`

**Principle:** Build the skeleton first, fill content later — easier to review and debug.

### Step 1.3 — Standard Variant *(next)*
Replace the Standard placeholder with the real implementation:
hidden native `<input type="file">`, styled trigger button, and file name display.

### Step 1.4 — Error & Validation States *(upcoming)*
Client-side maxSize validation, accept prop, error message display.

### Step 1.5 — SchemaField Integration *(upcoming)*
Update SchemaField `case "file"` to render `<FileInput>` instead of basic `<Input>`.
