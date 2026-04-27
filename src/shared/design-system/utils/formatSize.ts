/**
 * Formats a byte count into a human-readable string.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g. "1.5 MB", "256 B", "10.0 KB")
 */
export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
