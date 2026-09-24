import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";
import mirror from "../../foundations/composition/iconMirror.module.css";
import { classNames } from "../../foundations/helpers";

/** A speech tail leaves from the side a reader starts at, so it turns with them. */
export const CommentIcon = ({
  size = ICON_DEFAULTS.size,
  strokeWidth = ICON_DEFAULTS.strokeWidth,
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={classNames(mirror.mirrors, className)}
    aria-hidden="true"
  >
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.9-.9L3 20l1.1-4.4A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
  </svg>
);
