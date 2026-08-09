/**
 * A file format's identity: what to call it, how to draw it, and the colour the
 * wider world already associates with it.
 *
 * The colours stay here rather than becoming Design System tokens. They encode
 * *format identity*, not this product's roles — a PDF is not an `error` and a
 * spreadsheet is not a `success` — and two of them have no expression in the
 * palette at all. That four coincide with palette values is coincidence, not
 * identity. Colour is one column of this table beside the label and the path,
 * and splitting it out would put one fact in two homes.
 */
type FileCategory = {
  label: string;
  color: string;
  /** SVG path inside a 24x24 viewBox */
  path: string;
};

const FILE_CATEGORIES: Record<string, FileCategory> = {
  pdf: {
    label: "PDF",
    color: "#EF4444",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15v-2h1.5a1.5 1.5 0 0 1 0 3H9",
  },
  word: {
    label: "DOC",
    color: "#2563EB",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8 M8 9h2",
  },
  excel: {
    label: "XLS",
    color: "#10B981",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13l3 4 M11 13l-3 4",
  },
  archive: {
    label: "ZIP",
    color: "#F59E0B",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M10 12h1 M10 15h1 M10 18h1",
  },
  code: {
    label: "CODE",
    color: "#8B5CF6",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M10 12l-2 2 2 2 M14 12l2 2-2 2",
  },
  text: {
    label: "TXT",
    color: "#6B7280",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  },
  generic: {
    label: "FILE",
    color: "#6B7280",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  },
  image: {
    label: "IMG",
    color: "#8B5CF6",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0 M20 16l-3.5-3.5a1 1 0 0 0-1.4 0L8 19",
  },
};

/** Extension → category mapping */
const EXTENSION_MAP: Record<string, string> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  odt: "word",
  rtf: "word",
  xls: "excel",
  xlsx: "excel",
  csv: "excel",
  ods: "excel",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  js: "code",
  ts: "code",
  tsx: "code",
  jsx: "code",
  html: "code",
  css: "code",
  json: "code",
  xml: "code",
  py: "code",
  txt: "text",
  md: "text",
  log: "text",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
  avif: "image",
};

/** MIME prefix → category fallback */
const MIME_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  "text/csv": "excel",
  "application/zip": "archive",
  "application/x-rar-compressed": "archive",
  "application/gzip": "archive",
  "text/javascript": "code",
  "application/json": "code",
  "text/html": "code",
  "text/css": "code",
  "text/plain": "text",
};

/**
 * Resolves file category from file name or MIME type.
 * Extension takes priority over MIME type.
 */
function resolveCategory(fileName?: string, mimeType?: string): FileCategory {
  // Try extension first
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext && EXTENSION_MAP[ext]) {
      return FILE_CATEGORIES[EXTENSION_MAP[ext]];
    }
  }

  // Fall back to MIME type (exact match)
  if (mimeType && MIME_MAP[mimeType]) {
    return FILE_CATEGORIES[MIME_MAP[mimeType]];
  }

  // Fall back to MIME prefix (e.g. "image/png" → image)
  if (mimeType?.startsWith("image/")) {
    return FILE_CATEGORIES.image;
  }

  return FILE_CATEGORIES.generic;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Deliberately not `IconProps`. That contract promises any icon can replace any
 * other and that none is ever handed a raw colour; this one draws its colour
 * from data and carries its own size and stroke defaults, so it would be
 * claiming a substitutability it cannot honour.
 */
interface FileTypeIconProps {
  /** Rendered width and height in pixels. */
  size?: number;
  /** SVG stroke width. */
  strokeWidth?: number;
  /** Additional CSS class for positioning. */
  className?: string;
  /** File name — used to detect extension (e.g. "report.pdf") */
  fileName?: string;
  /** MIME type — fallback when extension is ambiguous */
  mimeType?: string;
}

/**
 * Renders the icon for a file's format, resolved from its extension or MIME type.
 *
 * @example
 * <FileTypeIcon fileName="report.pdf" size={18} />
 * <FileTypeIcon mimeType="application/zip" size={18} />
 */
export const FileTypeIcon = ({
  fileName,
  mimeType,
  size = 18,
  // Lighter than the rest of the set: this is a document outline dense with
  // detail, and a heavier weight closes its interior at the sizes it renders at.
  strokeWidth = 1.5,
  className,
}: FileTypeIconProps) => {
  const category = resolveCategory(fileName, mimeType);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={category.color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {category.path.split(" M").map((segment, i) => (
        <path key={i} d={i === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  );
};
