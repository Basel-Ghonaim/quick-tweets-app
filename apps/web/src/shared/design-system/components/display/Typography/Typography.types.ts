import type { NativeProps } from "../../shared";

/**
 * Emphasis within the reading order, never status. `error` and `success` are
 * absent deliberately: a role belongs to whichever component carries it, and a
 * second way to render red text would compete with the one that owns it.
 */
export type TypographyTone = "primary" | "secondary" | "tertiary" | "muted";

/** Styles whose size and weight assert a heading, whatever element carries them. */
export type TypographyTitleVariant =
  | "display-large"
  | "display-medium"
  | "heading-large"
  | "heading-medium"
  | "heading-small";

export type TypographyTextVariant =
  | "body-large"
  | "body-medium"
  | "body-small"
  | "label-large"
  | "label-medium"
  | "label-small";

export type TypographyVariant = TypographyTitleVariant | TypographyTextVariant;

/** Restricted rather than open, so `as` cannot smuggle in arbitrary markup. */
export type TypographyTitleElement =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "div";

export type TypographyTextElement = "p" | "span" | "div" | "strong" | "em" | "li";

export type TypographyElement = TypographyTitleElement | TypographyTextElement;

interface TypographyBase extends Omit<NativeProps<"p">, "ref"> {
  tone?: TypographyTone;
}

/**
 * Appearance and element are chosen separately, and a title style has to choose
 * both: looking like a heading is not what puts one in the document outline, so
 * defaulting the element would let a paragraph pass for a heading, or a heading
 * for one that never reaches the outline. Text styles carry no such claim and
 * default to a paragraph.
 */
export type TypographyProps =
  | (TypographyBase & {
      variant: TypographyTitleVariant;
      as: TypographyTitleElement;
    })
  | (TypographyBase & {
      variant?: TypographyTextVariant;
      as?: TypographyTextElement;
    });
