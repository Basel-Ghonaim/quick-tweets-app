import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Accessibility is an owned invariant (ADR 0010 Decision 5): the semantic tier
 * must clear WCAG AA for the relationships it guarantees, in every theme. A
 * failure here is diagnostic — it can mean two responsibilities were wrongly
 * collapsed onto one token, not merely that a value is off.
 *
 * Scope is the tier's *intrinsic* guarantees: text on surface, on-fill text on
 * its fill (rest and hover), and the focus ring against a surface.
 *
 * Two pairings are deliberately the consumer's, because whether a fill sits on
 * the page, on a raised surface, or inside a border is composition this tier
 * cannot see: a role fill bound as on-surface text, and a role fill acting as a
 * UI boundary against what is behind it (WCAG 1.4.11, 3:1). The second is not
 * hypothetical — `primary` against the dark page, and `success` and `warning`
 * against the light page, are below 3:1 — so a component binding those owns
 * either a border or a value change.
 */

const TOKENS_DIR = join(process.cwd(), "src/shared/design-system/foundations/tokens");
const THEME_DIR = join(process.cwd(), "src/shared/design-system/foundations/theme");

type Rgb = [number, number, number];

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

const ROLES = ["primary", "secondary", "success", "warning", "error", "info"] as const;
const SURFACES = ["--surface-page", "--surface-default"] as const;
const TEXT = ["--text-primary", "--text-secondary", "--text-tertiary", "--text-muted", "--text-accent"] as const;

type Pair = { fg: string; bg: string; min: number };

const PAIRS: Pair[] = [
  ...TEXT.flatMap((fg) => SURFACES.map((bg) => ({ fg, bg, min: 4.5 }))),
  ...ROLES.flatMap((r) => [
    { fg: `--control-${r}-text`, bg: `--control-${r}-rest`, min: 4.5 },
    { fg: `--control-${r}-text`, bg: `--control-${r}-hover`, min: 4.5 },
  ]),
  ...SURFACES.map((bg) => ({ fg: "--focus-ring", bg, min: 3 })),
];

const root = declarationsFor(readFileSync(join(TOKENS_DIR, "colors.css"), "utf8"), ":root");
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
