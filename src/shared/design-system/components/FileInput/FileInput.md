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
| `onNativeChange` | `ChangeEventHandler` | — | Raw native event for form engines |
| `onRemove` | `(file) => void` | — | Called when a file is removed |
| `accept` | `string` | — | Accepted file types (e.g. `"image/*"`) |
| `maxSize` | `number` | — | Max file size in bytes |
| `multiple` | `boolean` | `false` | Allow multi-file selection |
| `maxFiles` | `number` | — | Maximum number of files allowed (multi-file mode) |
| `minFiles` | `number` | — | Minimum number of files required (multi-file mode) |
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

### Step 1.3 — Standard Variant
**Files:** `FileInput.tsx`, `FileInput.module.css`

Replaced the Standard placeholder with real implementation:
- Hidden native `<input type="file">` bridged via `inputRef.current.click()`
- Styled trigger button with upload icon (SVG)
- File name display with ellipsis truncation ("No file chosen" default)
- `displayName` tracked in `useState` — not from ref during render (React 19 rule)
- Dynamic CSS variables for color theming (`--file-input-color`, `--file-input-alpha`)
- `children` prop for custom trigger content
- `helperText` support below the input
- Hover, focus-visible, active, invalid, and disabled interaction states

**Principle:** Dynamic CSS variables injected at runtime — same pattern as Input/Checkbox.

### Step 1.4 — Error & Validation States
**Files:** `FileInput.tsx`, `FileInput.stories.tsx`

Added client-side file validation:
- `maxSize` prop rejects oversized files with readable error ("filename" exceeds the 2.0 MB limit)
- `formatSize()` converts bytes → human-readable (B / KB / MB)
- Native input resets after rejection so the same file can be re-selected
- `validationError` state separate from external `errorMessage`
- `hasError` flag applies invalid styling on either error source
- Error priority: `validationError` > `errorMessage` > `helperText`
- New stories: `WithMaxSize`, `WithHelperText`, `ImagesOnly`

**Principle:** SRP — validation logic inside the component, error display in the template.

### Step 1.5 — SchemaField Integration
**Files:** `SchemaField.tsx`, `FileInput.types.ts`

Wired FileInput to the schema-driven form system:
- SchemaField `case "file"` now renders `<FileInput>` instead of `<Input>`
- Added `onNativeChange` prop to bridge with form engines (`useSchemaForm` reads `e.target.files`)
- `onNativeChange` fires the raw `ChangeEvent` after maxSize validation passes
- Register form's `profileImage` field automatically gets DS-styled file input

**Principle:** DIP — FileInput doesn't know about the form engine. The bridge (`onNativeChange`) is an abstraction.

### Step 1.6 — SRP Refactor
**Files:** `FileInput.tsx`, `variants/standard/StandardInput.tsx`, `variants/standard/StandardInput.types.ts`, `utils/formatSize.ts`

Refactored to follow Single Responsibility Principle:
- Extracted hardcoded `UploadIcon` SVG → uses DS icon library (`@shared/design-system/icons`)
- Extracted `formatSize()` → `utils/formatSize.ts` (reusable utility, one reason to change)
- Extracted `renderStandard()` → `variants/standard/StandardInput.tsx` (variant owns its own rendering + handlers + state)
- `FileInput.tsx` reduced from 218 → 110 lines — now a thin shell: container, label, variant switch, error display
- `StandardInput` reports validation errors to parent via `onValidationError` callback
- Each variant has its own directory (`variants/standard/`) for future Dropzone and Avatar

**Principle:** SRP — every file has one reason to change. The shell routes, the variant renders, the utility formats.

---

### Step 2.1 — BaseVariantProps Extraction
**Files:** `variants/variant.types.ts`, `variants/standard/StandardInput.types.ts`

Extracted the shared props interface used by all FileInput variants:
- `BaseVariantProps` defines everything a variant receives from the shell: `inputRef`, `generatedId`, `errorId`, `helperId`, `name`, `accept`, `maxSize`, `multiple`, `maxFiles`, `minFiles`, `disabled`, `isInvalid`, `errorMessage`, `helperText`, `color`, `onChange`, `onNativeChange`, `onValidationError`
- `StandardInputProps` and `DropzoneInputProps` now extend `BaseVariantProps` instead of duplicating the interface
- Added `maxFiles` and `minFiles` to `FileInputProps` → shell wires them to variants

**Principle:** DRY — one source of truth for variant props. Adding a new prop to all variants means editing one file.

### Step 2.2 — Dropzone Static Rendering
**Files:** `variants/dropzone/DropzoneInput.tsx`, `variants/dropzone/DropzoneInput.types.ts`, `FileInput.module.css`

Built the visual foundation for the Dropzone variant:
- Dashed-border drop zone container with upload icon and instructional text
- Dynamic CSS variables for color theming (same pattern as Standard)
- Zone class builder: `dropzoneWrapper` + conditional `isDragOver` and `isDisabled`
- Hidden native `<input>` with full `aria-describedby` linking
- Keyboard accessible: `role="button"`, `tabIndex={0}`, Enter/Space triggers click
- CSS: dashed border, centered content, hover/focus transitions, disabled state

**Principle:** Build the skeleton first — get the layout and accessibility right before adding behavior.

### Step 2.3 — Drag & Drop Behavior
**Files:** `variants/dropzone/DropzoneInput.tsx`, `FileInput.module.css`

Added full drag & drop interaction:
- `handleDragEnter` / `handleDragLeave` with drag counter ref (prevents flicker on child elements)
- `handleDrop` receives files and runs validation pipeline
- `handleDragOver` with `e.preventDefault()` to allow drop
- Visual feedback: border color change + background alpha on drag-over
- `validateFiles()` function enforces `accept` pattern matching on drop (browser only enforces for file picker, NOT for drag & drop):
  - Wildcard MIME: `image/*` → `file.type.startsWith("image/")`
  - Exact MIME: `application/pdf` → `file.type === "application/pdf"`
  - Extension: `.pdf` → `file.name.endsWith(".pdf")`
- `maxSize` validation with human-readable error from `formatSize()`
- Click-to-browse still works via `inputRef.current.click()`

**Principle:** Defense in depth — browser `accept` attribute only filters the file picker UI. Drop events bypass it entirely, so we validate manually.

### Step 2.4 — Multi-File Support & Image Grid Mode
**Files:** `variants/dropzone/DropzoneInput.tsx`, `FileInput.types.ts`, `variant.types.ts`, `FileInput.tsx`, `FileInput.module.css`, `icons/components/PlusIcon.tsx`

Extended the Dropzone with multi-file management and an image-only rendering mode:

**Multi-File Logic:**
- `accumulateFiles()` — merges new files with existing `fileList` in multi-mode, replaces in single-mode
- `maxFiles` check — rejects batch if total exceeds limit, shows "Maximum N files allowed"
- `minFiles` check — blocks deletion if removing would go below minimum, shows "Minimum N files required"
- `forwardFiles()` — sends `File[]` in multi-mode, `File` in single-mode via `onChange`

**Image Grid Mode (auto-detected when `accept` is image-only):**
- `isImageOnly` derived from `accept` — checks if ALL accepted types start with `image/`
- CSS grid with `repeat(auto-fill, 80px)` for fluid thumbnail layout
- Each thumbnail: 80×80px with `object-fit: cover` and `border-radius`
- X delete button on each thumbnail (visible on hover, red background)
- "Add more" button as last grid cell (same size as thumbnails, dashed border)
- Drag overlay covers the entire grid wrapper with icon + "Drop images here"
- Preview URLs via `URL.createObjectURL()` with cleanup in `useEffect` return

**New icon:** `PlusIcon` — used for "Add more" buttons.

**Principle:** LSP — the mode detection (`isImageOnly`) is automatic from the `accept` prop. The consumer doesn't need to specify a sub-variant.

### Step 2.5 — File List Mode & FileTypeIcon
**Files:** `variants/dropzone/DropzoneInput.tsx`, `FileInput.module.css`, `icons/components/FileTypeIcon.tsx`, `icons/components/index.ts`, `FileInput.stories.tsx`

Replaced the fragmented "inside + outside the box" file display with a clean bordered container:

**FileTypeIcon Component:**
- Auto-detects file category from extension (30+ mapped) or MIME type (exact match + prefix fallback)
- 7 categories with distinct colors: PDF (red `#EF4444`), Word (blue `#2563EB`), Excel (green `#10B981`), Archive (amber `#F59E0B`), Code (purple `#8B5CF6`), Image (purple `#8B5CF6`), Text/Generic (gray `#6B7280`)
- Each category has a unique SVG path inside a document silhouette
- Resolution priority: extension → exact MIME → MIME prefix → generic fallback

**File List Design:**
- Bordered container (`.fileListWrapper`) replaces the dashed dropzone after files are added
- Each row (`.fileListRow`): file type icon or inline 24×24 thumbnail (for images) + truncated name (`min-width: 0` + `text-overflow: ellipsis`) + size + trash button
- "Add more files" / "Replace file" dashed row at the bottom (contextual label based on `multiple`)
- Drag overlay (`.fileListOverlay`) covers the entire container on drag-over
- Row separators via `border-bottom`, hover effect, smooth transitions
- Preview URLs generated for ALL image files (not just image-only mode) so inline thumbnails work in mixed mode

**Stories added:** FileList, PdfOnly, PdfMax5, Mixed

**Principle:** OCP — FileTypeIcon is open for extension (add new categories/extensions) without modifying existing rendering logic.

### Step 2.6 — SOLID Refactoring
**Files:** `DropzoneInput.tsx`, `useDropzoneFiles.ts`, `validateDropzoneFiles.ts`, `components/DragOverlay.tsx`, `components/DropzoneEmpty.tsx`, `components/ImageGrid.tsx`, `components/FileList.tsx`

Decomposed the 472-line monolith into 7 focused modules:

**Logic layer:**
- `validateDropzoneFiles.ts` — Pure function. Takes `FileList` + options → returns `{ valid, error }`. No React, no state. Independently testable.
- `useDropzoneFiles.ts` — Custom hook. Owns ALL state (`fileList`, `previews`, `isDragOver`), derived values (`isImageOnly`, `isAtCapacity`), event handlers (`handleDrop`, `handleDragEnter/Over/Leave`, `handleFileChange`, `removeFile`, `handleZoneClick`), and the preview URL lifecycle. Returns a clean API object.

**Rendering layer:**
- `DragOverlay.tsx` — Shared translucent overlay for both modes. Accepts `visible` and `label`.
- `DropzoneEmpty.tsx` — Shared empty state (icon + title + subtext). Accepts `mode` ("image" | "file") and `isDragOver`. Eliminates duplicated JSX.
- `ImageGrid.tsx` — Thumbnail grid with X delete buttons and "Add more" cell. Receives `files`, `previews`, callbacks.
- `FileList.tsx` — File rows with type icons/thumbnails and "Add more" / "Replace" row. Receives `files`, `previews`, `multiple`, callbacks.

**Orchestrator:**
- `DropzoneInput.tsx` — Thin orchestrator (~170 lines). Calls `useDropzoneFiles`, computes CSS variables and zone classes, renders the correct sub-components based on `isImageOnly` and `fileList.length`.

**Principle:** SRP — each file has one reason to change. The hook changes when logic changes. Sub-components change when their rendering changes. The orchestrator changes when the routing between modes changes.

---

### File Structure (after Phase 2)

```
FileInput/
├── FileInput.tsx              # Shell: container, label, variant switch, errors
├── FileInput.types.ts         # Type contract (includes maxFiles, minFiles)
├── FileInput.module.css       # Styles (shared by all variants)
├── FileInput.stories.tsx      # Storybook stories (24 total)
├── FileInput.md               # This documentation
├── index.ts                   # Barrel export
└── variants/
    ├── index.ts               # Variants barrel
    ├── variant.types.ts       # BaseVariantProps (shared by all variants)
    ├── standard/
    │   ├── StandardInput.tsx
    │   └── StandardInput.types.ts
    └── dropzone/
        ├── DropzoneInput.tsx           # Orchestrator
        ├── DropzoneInput.types.ts      # Extends BaseVariantProps
        ├── useDropzoneFiles.ts         # State + logic hook
        ├── validateDropzoneFiles.ts    # Pure validation utility
        └── components/
            ├── DragOverlay.tsx         # Translucent overlay
            ├── DropzoneEmpty.tsx        # Empty state
            ├── ImageGrid.tsx           # Thumbnail grid
            └── FileList.tsx            # File rows list
```

---

### Step 3.1 — Types & AvatarInput Shell
**Files:** `FileInput.types.ts`, `variants/variant.types.ts`, `variants/avatar/AvatarInput.tsx`, `variants/avatar/AvatarInput.types.ts`, `FileInput.tsx`, `variants/index.ts`, `FileInput.module.css`, `FileInput.stories.tsx`

Foundation for the Avatar variant with four visual styles:
- Added `AvatarFill` type (`"default" | "outline"`) to `FileInput.types.ts`
- Added `avatarShape` and `avatarFill` to `BaseVariantProps` — all variants receive them from the shell, only Avatar uses them
- Created `AvatarInput.tsx` shell: renders container based on `avatarShape` × `avatarFill`, click-to-browse, keyboard accessible (`role="button"`, `tabIndex={0}`, Enter/Space)
- CSS: `.avatarWrapper` (flex, centered, `overflow: hidden`), `.avatarCircle` (120px × 120px, `border-radius: 50%`), `.avatarRectangle` (100% width, `aspect-ratio: 4/3`), `.avatarDefault` (dashed border), `.avatarOutline` (gray background)
- Wired into `FileInput.tsx` shell (replaced Phase 3 placeholder), exported from `variants/index.ts`
- 5 stories: AvatarCircle, AvatarCircleOutline, AvatarRectangle, AvatarRectangleOutline, AvatarDisabled

**Principle:** LSP — AvatarInput implements the same `BaseVariantProps` interface as StandardInput and DropzoneInput. The shell's `renderVariant()` switch treats all variants uniformly without knowing their internals.

### Step 3.2 — AvatarEmpty Sub-Component
**Files:** `variants/avatar/components/AvatarEmpty.tsx`, `variants/avatar/AvatarInput.tsx`

Extracted empty state content into a dedicated component:
- `fill="outline"` → `UserIcon` (32px) + "Upload" — profile silhouette placeholder
- `fill="default"` → `CameraIcon` (24px) + "Upload media" — upload prompt
- AvatarInput delegates with `<AvatarEmpty fill={avatarFill} />`

**Principle:** SRP — AvatarEmpty has one reason to change: when the empty state visual design changes. AvatarInput doesn't know what icons or text the empty state renders.

### Step 3.3 — useAvatarFile Hook (Drag & Drop, Preview, Video Thumbnail)
**Files:** `variants/avatar/useAvatarFile.ts`, `variants/avatar/AvatarInput.tsx`, `FileInput.module.css`

Created the logic hook for single-file management:

**State:**
- `file: File | null` — the selected file (single, not accumulated)
- `preview: string` — blob URL for images, canvas `dataURL` for video thumbnails
- `isDragOver: boolean` — drag highlight state

**File selection:**
- On file select: replaces current file (no accumulation — single-file mode)
- On file remove: clears file + revokes preview URL + resets native input
- On replace: triggers `inputRef.current.click()` for new file picker
- Reuses `validateDropzoneFiles()` from dropzone for `accept`/`maxSize` validation

**Preview generation (in `useEffect`):**
- **Images:** `URL.createObjectURL(file)` with cleanup via `URL.revokeObjectURL()`
- **Videos:** Auto-generate thumbnail — creates `<video>` in memory, seeks to 10% of duration, draws frame to offscreen `<canvas>`, exports via `canvas.toDataURL("image/jpeg", 0.8)`. Falls back to empty preview on failure.

**Drag & drop:**
- `handleDragEnter`/`handleDragLeave` with drag counter ref (prevents flicker)
- `handleDrop` validates then selects first file
- `handleDragOver` with `e.preventDefault()` to allow drop

**Orchestrator updates:**
- Two render paths: empty state (click/drag) vs filled state (preview + hover overlay)
- CSS: `.avatarFilled` (no border), `.avatarPreviewImg` (`position: absolute`, `object-fit: cover`), `.avatarDragOver` (color highlight + box-shadow), `.avatarOverlay` (semi-transparent + `backdrop-filter: blur`), `.avatarOverlayBtn` (glass buttons)

**Principle:** DIP — `useAvatarFile` depends on the `validateDropzoneFiles` abstraction, not on the Dropzone variant directly. The validation logic is shared and reusable, not duplicated.

### Step 3.4 — AvatarOverlay Sub-Component
**Files:** `variants/avatar/components/AvatarOverlay.tsx`, `variants/avatar/AvatarInput.tsx`

Extracted the hover overlay into its own component:
- Receives `onDelete` and `onReplace` callbacks as props
- Renders two glass-style buttons inside a semi-transparent backdrop
- AvatarInput delegates with `<AvatarOverlay onDelete={...} onReplace={...} />`

**Principle:** SRP — AvatarOverlay has one reason to change: when the overlay design or button layout changes. The orchestrator doesn't know about button labels, styles, or `aria-label` attributes.

### Step 3.5 — Stories
**Files:** `FileInput.stories.tsx`

Added 2 additional stories:
- `AvatarVideo` — `accept="video/*"` for video thumbnail testing
- `AvatarWithError` — `isInvalid` + `errorMessage` for error state display

Total Avatar stories: 7 (AvatarCircle, AvatarCircleOutline, AvatarRectangle, AvatarRectangleOutline, AvatarDisabled, AvatarVideo, AvatarWithError)

**Principle:** Each story tests one axis of variation — shape, fill, media type, state.

---

### SOLID Compliance Summary (Avatar Variant)

| Principle | How It's Applied |
|---|---|
| **S — Single Responsibility** | `useAvatarFile` → logic only. `AvatarEmpty` → empty state only. `AvatarOverlay` → hover overlay only. `AvatarInput` → wiring only. Each file has one reason to change. |
| **O — Open/Closed** | New visual styles (e.g. a future `"rounded"` shape) can be added via CSS class without modifying sub-components. New overlay actions can be added to `AvatarOverlay` without changing the orchestrator. |
| **L — Liskov Substitution** | `AvatarInput` implements `BaseVariantProps` — the shell treats it identically to `StandardInput` and `DropzoneInput` via the `renderVariant()` switch. |
| **I — Interface Segregation** | `AvatarEmpty` takes only `fill`. `AvatarOverlay` takes only `onDelete` + `onReplace`. Sub-components receive minimal, focused interfaces — not the full `BaseVariantProps`. |
| **D — Dependency Inversion** | `useAvatarFile` depends on `validateDropzoneFiles` (a pure utility), not on the Dropzone component. The orchestrator depends on hook return types, not on state implementation details. |

---

### File Structure (after Phase 3)

```
FileInput/
├── FileInput.tsx              # Shell: container, label, variant switch, errors
├── FileInput.types.ts         # Type contract (AvatarFill, maxFiles, minFiles)
├── FileInput.module.css       # Styles (shared by all variants)
├── FileInput.stories.tsx      # Storybook stories (31 total)
├── FileInput.md               # This documentation
├── index.ts                   # Barrel export
└── variants/
    ├── index.ts               # Variants barrel
    ├── variant.types.ts       # BaseVariantProps (shared by all variants)
    ├── standard/
    │   ├── StandardInput.tsx
    │   └── StandardInput.types.ts
    ├── dropzone/
    │   ├── DropzoneInput.tsx           # Orchestrator
    │   ├── DropzoneInput.types.ts
    │   ├── useDropzoneFiles.ts         # State + logic hook
    │   ├── validateDropzoneFiles.ts    # Pure validation (shared)
    │   └── components/
    │       ├── DragOverlay.tsx
    │       ├── DropzoneEmpty.tsx
    │       ├── ImageGrid.tsx
    │       └── FileList.tsx
    └── avatar/
        ├── AvatarInput.tsx            # Orchestrator
        ├── AvatarInput.types.ts       # Extends BaseVariantProps
        ├── useAvatarFile.ts           # State + logic hook (single-file)
        └── components/
            ├── AvatarEmpty.tsx        # Empty state (4 styles)
            └── AvatarOverlay.tsx      # Hover overlay (Delete / Replace)
```
