# FileInput — GitHub Issues

---

## Parent Issue

### Title: FileInput DS Component — Multi-variant file upload component

Build a FileInput component for the design system with 3 visual variants
(Standard, Dropzone, Avatar), file list cards, and full accessibility.
Supports single/multi-file selection, drag & drop, image preview,
client-side validation, and integrates with SchemaField for schema-driven forms.

**Phases:**

- Phase 1: Foundation + Standard variant + SchemaField wiring
- Phase 2: Dropzone variant + drag & drop
- Phase 3: Avatar / Image Picker + preview
- Phase 4: File List Cards + progress
- Phase 5: Polish, accessibility, animations & docs

---

## Child Issue — Phase 1

### Title: FileInput — Foundation + Standard variant

Create the FileInput component with types, base shell, Standard variant,
error/validation states, and SchemaField integration.

**Steps:**

1. Define types and interfaces (FileInputProps, variants, colors)
2. Create component shell with variant switch
3. Implement Standard variant (hidden input + styled trigger + file name)
4. Add error states (isInvalid, errorMessage, maxSize validation)
5. Wire to SchemaField — replace basic `<input type="file">`


## Child Issue — Phase 2

### Title: FileInput — Dropzone variant: drag & drop, image grid, file list, SOLID architecture

Implement the complete Dropzone variant for the FileInput component with two rendering modes, multi-file management, and a clean SOLID architecture.

**What was built:**

1. **Core Dropzone** — Dashed-border drop zone with drag & drop behavior, drag-over visual feedback, click-to-browse, keyboard accessibility, and client-side validation (`accept` pattern matching on drop + `maxSize`).

2. **Multi-File Support** — `maxFiles` / `minFiles` props for file count limits. File accumulation in multi-file mode, file replacement in single-file mode. Validation error messages for count violations.

3. **Image Grid Mode** — Auto-detected when `accept` is image-only (e.g. `image/*`, `image/png,image/jpeg`). CSS grid of 80×80px thumbnails with `repeat(auto-fill, 80px)`. "Add more" button as a grid cell. X delete button on each thumbnail (hover). Drag overlay covers the entire grid. Memory management with `URL.createObjectURL` / `revokeObjectURL`.

4. **File List Mode** — For non-image or mixed file types. Bordered container replaces the dashed dropzone after files are added. Each row shows a file type icon or inline image thumbnail (24×24), truncated file name, file size, and trash button. "Add more files" / "Replace file" contextual label. Drag overlay covers the entire list.

5. **FileTypeIcon Component** — Auto-detects file category from extension (30+) or MIME type. Categories: PDF (red), Word (blue), Excel (green), Archive (amber), Code (purple), Image (purple), Text (gray), Generic (gray). MIME prefix fallback for `image/*`.

6. **PlusIcon Component** — Used for "Add more" buttons in both grid and list modes.

7. **SOLID Refactoring** — Decomposed 472-line monolith into 7 focused modules:
   - `DropzoneInput.tsx` — thin orchestrator (~170 lines)
   - `useDropzoneFiles.ts` — custom hook (all state + event logic)
   - `validateDropzoneFiles.ts` — pure validation utility
   - `components/DragOverlay.tsx` — shared translucent overlay
   - `components/DropzoneEmpty.tsx` — shared empty state
   - `components/ImageGrid.tsx` — thumbnail grid renderer
   - `components/FileList.tsx` — file rows renderer

8. **`BaseVariantProps` extraction** — Shared type interface for all FileInput variants, eliminating duplication between Standard and Dropzone.

**Stories added (12):**
Dropzone, DropzoneDisabled, DropzoneWithHelper, MultiFile, MaxFiles, MinFiles, ImageGrid, ImageGridMax5, ImageGridSuccess, FileList, PdfOnly, PdfMax5, Mixed

**Files changed:** 18 files, +1,417 / −54 lines

---

### Title PR: feat(design-system): implement Dropzone variant — drag & drop, image grid, file list, SOLID architecture

### Description PR:

Implements the complete Dropzone variant for the `FileInput` design system component. This is Phase 2 of the FileInput roadmap.

**Highlights:**
- Drag & drop with client-side validation (`accept`, `maxSize`)
- Image-only mode: auto-fill thumbnail grid with add-more and X delete
- File list mode: bordered container with `FileTypeIcon`, inline image previews, ellipsis truncation
- Multi-file management: `maxFiles` / `minFiles` with accumulation logic
- SOLID architecture: 472-line monolith → 7 focused files (hook, validator, 4 sub-components, orchestrator)
- 2 new icons: `PlusIcon`, `FileTypeIcon` (30+ extensions, 7 color-coded categories)
- 12 Storybook stories covering all states and modes

**How to test:**
1. `npm run storybook`
2. Navigate to **Design System > FileInput**
3. Test: DropzoneImageGrid, DropzoneFileList, DropzonePdfOnly, DropzoneMixed, DropzoneMaxFiles, DropzoneMinFiles

**Commits:**
- `1844308` — extract BaseVariantProps
- `b8c8066` — Dropzone static rendering
- `485c956` — drag & drop behavior
- `fd2a0e4` — multi-file support + image grid
- `2a6ca80` — state error fix
- `b56bd20` — file list mode + FileTypeIcon
- `7aefc31` — UX polish (replace label, name truncation)
- `cde6ac0` — SOLID refactoring

---

## Child Issue — Phase 3

### Title: FileInput — Avatar variant: single-file media upload with preview, drag & drop, and SOLID architecture

Implement the Avatar variant for the FileInput component with four visual styles, single-file media upload, image/video preview, hover overlay, and SOLID sub-component architecture.

**What was built:**

1. **Types & Shell** — Added `AvatarFill` (`"default" | "outline"`), `AvatarBorder` (`"dashed" | "solid" | "none"`) types and `avatarFill`, `avatarBorder`, `avatarSize` props to `FileInputProps`. Created `AvatarInput.tsx` orchestrator, wired into the main `FileInput` shell. Extended `BaseVariantProps` with avatar-specific configuration.

2. **Four Visual Styles** — Shape × Fill matrix:
   - `circle + default`: round, dashed border, CameraIcon + "Upload media"
   - `circle + outline`: round, colored background, UserIcon + "Upload"
   - `rectangle + default`: rectangular (4:3), dashed border, CameraIcon
   - `rectangle + outline`: rectangular, colored background, UserIcon
   
3. **Customization Props** — `avatarBorder` controls border style (dashed/solid/none). `avatarSize` controls dimensions in pixels (circle W&H, rectangle max-width). Both applied via CSS custom properties (`--avatar-border-style`, `--avatar-size`).

4. **useAvatarFile Hook** — Custom hook encapsulating all state and logic:
   - Single-file state (`file: File | null`) — replaces current file, no accumulation
   - Image preview via `URL.createObjectURL` with cleanup in effect cleanup
   - Video thumbnail via canvas capture — creates `<video>` in memory, seeks to 10%, draws frame to `<canvas>`, exports as `toDataURL("image/jpeg", 0.8)`
   - Drag & drop with counter ref (prevents flicker on child elements)
   - File removal with native input reset (re-selecting same file works)
   - Reuses `validateDropzoneFiles` for `accept`/`maxSize` validation (DIP)

5. **AvatarEmpty Sub-Component** — Renders different icon + text per fill style. `outline` → UserIcon, `default` → CameraIcon. Receives only `fill` prop (ISP).

6. **AvatarOverlay Sub-Component** — Hover overlay with two circular icon buttons: TrashIcon (delete, red hover) and RefreshIcon (replace). Glassmorphism styling with `backdrop-filter: blur`. `scale(1.1)` micro-animation on hover.

7. **RefreshIcon** — New icon added to the DS icon library (circular arrows SVG). Exported from `icons/components/index.ts`.

8. **Color Theming** — Both avatar and dropzone now use the component's `color` prop at rest (border + icon/text). Hover adds the alpha background for deepening effect. Consistent design language across all variants.

**SOLID Architecture:**

| Principle | Application |
|---|---|
| **S — Single Responsibility** | `useAvatarFile` → logic, `AvatarEmpty` → empty state, `AvatarOverlay` → hover overlay, `AvatarInput` → wiring |
| **O — Open/Closed** | New shapes via CSS class. New overlay actions via `AvatarOverlay` props |
| **L — Liskov Substitution** | `AvatarInput` implements `BaseVariantProps`. Shell treats all variants uniformly |
| **I — Interface Segregation** | `AvatarEmpty` takes only `fill`. `AvatarOverlay` takes only `onDelete` + `onReplace` |
| **D — Dependency Inversion** | `useAvatarFile` depends on `validateDropzoneFiles` (pure utility), not on Dropzone component |

**Stories added (12):**
AvatarCircle, AvatarCircleOutline, AvatarRectangle, AvatarRectangleOutline, AvatarDisabled, AvatarVideo, AvatarWithError, AvatarSuccess, AvatarSolidBorder, AvatarNoBorder, AvatarLarge, AvatarSmall

---

### Title PR: feat(design-system): implement Avatar variant — single-file media upload, preview, drag & drop, SOLID architecture

### Description PR:

Implements the Avatar variant for the `FileInput` design system component. This is Phase 3 of the FileInput roadmap.

**Highlights:**
- Four visual styles: circle/rectangle × default/outline with customizable border (dashed/solid/none) and size
- Single-file upload with click-to-browse, drag & drop, and keyboard accessibility
- Image preview (blob URL) and video thumbnail generation (canvas capture)
- Hover overlay with icon buttons (TrashIcon for delete, RefreshIcon for replace) + glassmorphism
- Color theming at rest (both avatar and dropzone now linked to the `color` prop from render)
- SOLID sub-component architecture: orchestrator, hook, 2 render components
- New icon: `RefreshIcon` (circular arrows)
- 12 Storybook stories covering all visual permutations and states
- Full documentation with code examples in `FileInput.md`

**How to test:**
1. `npm run storybook`
2. Navigate to **Design System > Forms > FileInput**
3. Test: AvatarCircle, AvatarCircleOutline, AvatarRectangle, AvatarRectangleOutline
4. Upload an image → verify preview fills shape with `object-fit: cover`
5. Upload a video → verify auto-generated thumbnail
6. Hover preview → verify overlay with Delete / Replace icon buttons
7. Try drag & drop onto the avatar
8. Toggle `avatarBorder`, `avatarSize`, `color` in Storybook controls

**Commits:**
- `8faf41b` — Step 3.1: Types, shell, CSS, 5 stories
- `d494d37` — Step 3.2: AvatarEmpty sub-component
- `74496a3` — Step 3.3: useAvatarFile hook, drag & drop, preview, overlay
- `59a4917` — Step 3.5: AvatarVideo + AvatarWithError stories
- `da0aa00` — Step 3.4: AvatarOverlay extraction + Phase 3 docs + SOLID audit
- `e33463a` — Overlay icon button redesign + RefreshIcon
- `1a7abc7` — Color theming for avatar fills
- `dd61bc0` — avatarBorder + avatarSize props
- `9f70cff` — Dropzone + avatar color alignment at rest
