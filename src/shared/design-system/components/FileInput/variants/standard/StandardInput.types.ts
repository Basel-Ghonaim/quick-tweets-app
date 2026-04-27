import type { ReactNode } from "react";
import type { BaseVariantProps } from "../variant.types";

/**
 * Props for the StandardInput variant.
 *
 * Extends BaseVariantProps with Standard-specific props.
 * The variant owns its own state (displayName)
 * and handlers (handleFileChange, handleTriggerClick).
 */
export interface StandardInputProps extends BaseVariantProps {
  /** Custom trigger content — replaces the default button */
  children?: ReactNode;
}
