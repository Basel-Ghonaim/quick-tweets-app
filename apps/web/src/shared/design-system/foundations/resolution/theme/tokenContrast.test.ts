import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { ROLES, TONES } from "../../vocabulary";

/**
 * Accessibility is an owned invariant (ADR 0010 Decision 5): the semantic tier
 * must clear WCAG AA for the relationships it guarantees, in every theme. A
 * failure here is diagnostic — it can mean two responsibilities were wrongly
 * collapsed onto one token, not merely that a value is off.
 *
 * The split into a fill and an on-surface token per role lets each answer to its
 * own criterion, so the check covers, in both themes:
 *   - text on a surface, and on-surface role text, at 4.5:1 (WCAG 1.4.3);
 *   - on-fill text against its fill, default and hover, at 4.5:1;
 *   - a fill as a UI boundary against the page, resting and hover, a control's own
 *     boundary against a surface, and either focus ring against a surface, at
 *     3:1 (WCAG 1.4.11).
 *
 * One pairing stays the consumer's, and only for the resting fills: a fill placed
 * on a *raised* surface rather than the page contrasts less, and whether a
 * component does that is composition this tier cannot see. The hover values clear
 * 3:1 against both surfaces, so the question does not reach them.
 */

const TOKENS_DIR = join(process.cwd(), "src/shared/design-system/foundations/tokens");
const THEME_DIR = join(process.cwd(), "src/shared/design-system/foundations/resolution/theme");

type Rgb = [number, number, number];

const cssFilesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

function declarationsFor(cssText: string, selector: string): Map<string, string> {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const decls = new Map<string, string>();
  for (const block of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (block[1].trim() !== selector) continue;
    for (const decl of block[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      decls.set(decl[1], decl[2].trim());
    }
  }
  return decls;
}

function toRgb(value: string): Rgb {
  const v = value.trim().toLowerCase();
  if (v === "white") return [255, 255, 255];
  if (v === "black") return [0, 0, 0];
  const hex = v.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/.test(full)) throw new Error(`not an opaque colour: ${value}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

/** Resolve a custom property to an opaque colour, following var() chains through
 *  the theme's declarations and then the theme-invariant :root. Throws if a name
 *  is undefined, so a parsing regression fails loudly rather than skipping. */
function resolve(name: string, theme: Map<string, string>, root: Map<string, string>): Rgb {
  let value: string | undefined = theme.get(name) ?? root.get(name);
  for (let hops = 0; value?.startsWith("var(") && hops < 10; hops++) {
    const inner = value.match(/var\(\s*(--[\w-]+)/)?.[1];
    if (!inner) break;
    value = theme.get(inner) ?? root.get(inner);
  }
  if (!value) throw new Error(`unresolved custom property: ${name}`);
  return toRgb(value);
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Derived, not mirrored: a copy would make this check agree with itself instead
// of with the vocabulary the tokens are actually named by.
const SURFACES = ["--surface-page", "--surface-default"] as const;
const TEXT = TONES.map((tone) => `--text-${tone}`);

type Pair = { fg: string; bg: string; min: number };

const PAIRS: Pair[] = [
  ...TEXT.flatMap((fg) => SURFACES.map((bg) => ({ fg, bg, min: 4.5 }))),
  ...ROLES.flatMap((r) => [
    { fg: `--role-fill-${r}-text`, bg: `--role-fill-${r}`, min: 4.5 },
    { fg: `--role-fill-${r}-text`, bg: `--role-fill-${r}-hover`, min: 4.5 },
  ]),
  ...ROLES.flatMap((r) => SURFACES.map((bg) => ({ fg: `--role-on-surface-${r}`, bg, min: 4.5 }))),
  ...ROLES.map((r) => ({ fg: `--role-fill-${r}`, bg: "--surface-page", min: 3 })),
  // The state a pointer user is in at the moment they act is a boundary like any
  // other. Against `--surface-page` alone: the resting fills' shortfall against a
  // raised surface is a recorded deferral, and is not this pair's to fail on.
  ...ROLES.map((r) => ({ fg: `--role-fill-${r}-hover`, bg: "--surface-page", min: 3 })),
  // Not a background: an accent link inside a sentence is told apart from the
  // text beside it, and colour alone has to carry that where no underline does.
  { fg: "--text-accent", bg: "--text-primary", min: 3 },
  ...SURFACES.map((bg) => ({ fg: "--focus-ring", bg, min: 3 })),
  // A control's boundary is the whole affordance where its fill barely differs
  // from the card behind it, so it answers to 1.4.11 rather than to whatever a
  // decorative hairline happens to reach.
  ...SURFACES.map((bg) => ({ fg: "--control-border", bg, min: 3 })),
  ...SURFACES.map((bg) => ({ fg: "--focus-ring-error", bg, min: 3 })),
];

// Every `:root` declaration under the token tree, not one named file: the tiers
// are separated by directory, so which file a primitive sits in is free to change
// without this check silently resolving to nothing.
const root = new Map(
  cssFilesUnder(TOKENS_DIR).flatMap((file) => [
    ...declarationsFor(readFileSync(file, "utf8"), ":root"),
  ]),
);
const themes = {
  light: declarationsFor(readFileSync(join(THEME_DIR, "light.css"), "utf8"), '[data-theme="light"]'),
  dark: declarationsFor(readFileSync(join(THEME_DIR, "dark.css"), "utf8"), '[data-theme="dark"]'),
};

describe("semantic tier AA contrast", () => {
  for (const [themeName, theme] of Object.entries(themes)) {
    test(`every guaranteed pair clears AA in the ${themeName} theme`, () => {
      const failures: string[] = [];
      for (const { fg, bg, min } of PAIRS) {
        const ratio = contrast(resolve(fg, theme, root), resolve(bg, theme, root));
        if (ratio < min) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
      }
      expect(failures).toEqual([]);
    });
  }

  test("the ratio is computed correctly (black on white is 21:1)", () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
  });

  test("a below-threshold pair is reported, not silently passed", () => {
    // mid-grey on white is ~2.8:1 — must be caught, or the check proves nothing.
    expect(contrast([150, 150, 150], [255, 255, 255])).toBeLessThan(4.5);
  });
});
