import { formatSize } from "../formatSize";
import type { FileSelectionContent } from "../FileInput.types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ValidationOptions {
  /** Accepted file types (e.g. "image/*", ".pdf,.doc") */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
}

interface ValidationResult {
  valid: File[];
  error?: string;
}

// ─── Validator ──────────────────────────────────────────────────────────────

/**
 * Validates a FileList against accept patterns and maxSize.
 *
 * Browser `<input accept>` only enforces for the file picker,
 * NOT for drag & drop. This function covers both cases.
 *
 * @returns `{ valid }` if all pass, `{ valid: [], error }` on first failure
 */
export function validateSelection(
  files: FileList,
  options: ValidationOptions,
  content: FileSelectionContent,
): ValidationResult {
  const fileArray = Array.from(files);

  // ── Accept filter ──
  if (options.accept) {
    const acceptedTypes = options.accept
      .split(",")
      .map((t) => t.trim().toLowerCase());

    const rejected = fileArray.find((file) => {
      return !acceptedTypes.some((pattern) => {
        if (pattern.endsWith("/*")) {
          return file.type.startsWith(pattern.slice(0, -2));
        }
        if (pattern.startsWith(".")) {
          return file.name.toLowerCase().endsWith(pattern);
        }
        return file.type === pattern;
      });
    });

    if (rejected) {
      return {
        valid: [],
        error: content.notAccepted(rejected.name),
      };
    }
  }

  // ── MaxSize filter ──
  if (options.maxSize) {
    const oversized = fileArray.find((f) => f.size > options.maxSize!);
    if (oversized) {
      return {
        valid: [],
        error: content.tooLarge(oversized.name, formatSize(options.maxSize)),
      };
    }
  }

  return { valid: fileArray };
}
