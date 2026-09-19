import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

/**
 * Direction-agnostic authoring, enforced rather than trusted (ADR 0010
 * Decision 6). A physical property does not mirror: `margin-left` stays on the
 * left when the document turns around, so one of them is all it takes for a
 * right-to-left reader to meet a layout that half-turned.
 *
 * It is a check rather than a convention because of when the cost lands. The
 * ADR chose logical properties on the ground that they are free while writing
 * and prohibitively expensive to retrofit — which means the moment the habit
 * lapses is invisible, and the bill arrives much later against every stylesheet
 * at once. There was exactly one physical property in the tree when this was
 * written; a check is what keeps that number from drifting upward unobserved.
 *
 * No exemption list, deliberately — the same reasoning the owned focus
 * indicator's check states. A treatment that genuinely must not mirror is rare
 * enough to earn its reason written at the value, and an exemption here would
 * erode the invariant it exists to protect.
 */

const SRC = join(process.cwd(), "src");

/**
 * Properties with a logical equivalent, so a match is always a choice that
 * could have been written another way:
 *   margin/padding/border-left|right   -> -inline-start | -inline-end
 *   left:/right: offsets               -> inset-inline-start | inset-inline-end
 *   text-align: left|right             -> start | end
 *   float: left|right                  -> inline-start | inline-end
 * `border-radius`, `background-position` and transforms are untouched: none of
 * them names a side that a direction change is supposed to swap.
 */
const PROPERTIES = String.raw`(?:margin|padding|border)-(?:left|right)(?:-[\w-]+)?|left|right|text-align|float`;

const PHYSICAL = new RegExp(String.raw`(?:^|[\s;{])(${PROPERTIES})\s*:\s*([^;{}]*)`, "g");

const isViolation = (property: string, value: string): boolean => {
  if (property === "text-align" || property === "float")
    return /^\s*(left|right)\b/.test(value);
  return true;
};

const stripComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "));

const stylesheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

const lineOf = (text: string, index: number) =>
  text.slice(0, index).split("\n").length;

function physicalIn(file: string): string[] {
  const css = stripComments(readFileSync(file, "utf8"));
  const label = relative(SRC, file).split(sep).join("/");

  return [...css.matchAll(PHYSICAL)]
    .filter(([, property, value]) => isViolation(property, value))
    .map(
      (match) =>
        `${label}:${lineOf(css, match.index ?? 0)} — ${match[1]}`,
    );
}

const files = stylesheets(SRC);

/** The same properties, as the CSS names a style object's keys stand for. */
const PHYSICAL_PROPERTY = new RegExp(`^(?:${PROPERTIES})$`);

const toCssName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// Stories render in both directions too, so a physical style there would make that proof lie.
const components = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return components(full);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
  });

/** The object literals an expression can evaluate to, read through the forms that choose one. */
function objectsIn(node: ts.Expression): ts.ObjectLiteralExpression[] {
  if (ts.isObjectLiteralExpression(node)) return [node];
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  )
    return objectsIn(node.expression);
  if (ts.isConditionalExpression(node))
    return [...objectsIn(node.whenTrue), ...objectsIn(node.whenFalse)];
  if (ts.isBinaryExpression(node)) return [...objectsIn(node.left), ...objectsIn(node.right)];
  return [];
}

/** The string literals a value can evaluate to, through the same forms. */
function literalsIn(node: ts.Expression): string[] {
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node))
    return literalsIn(node.expression);
  if (ts.isConditionalExpression(node))
    return [...literalsIn(node.whenTrue), ...literalsIn(node.whenFalse)];
  if (ts.isBinaryExpression(node)) return [...literalsIn(node.left), ...literalsIn(node.right)];
  return [];
}

/** Every style object in a source: a `style` attribute's value, and the style `customProperties` merges. */
function inlinePhysicalIn(name: string, source: string): string[] {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles: ts.ObjectLiteralExpression[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(file) === "style" &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    )
      styles.push(...objectsIn(node.initializer.expression));
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(file) === "customProperties" &&
      node.arguments[1]
    )
      styles.push(...objectsIn(node.arguments[1]));
    ts.forEachChild(node, visit);
  };
  visit(file);

  return styles.flatMap((style) =>
    style.properties.flatMap((property) => {
      // `{ left }` names its key and hides its value, which only `text-align` and `float` need.
      const shorthand = ts.isShorthandPropertyAssignment(property);
      if (!shorthand && !ts.isPropertyAssignment(property)) return [];
      const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? toCssName(property.name.text)
        : null;
      if (!key || !PHYSICAL_PROPERTY.test(key)) return [];
      const values = shorthand ? [] : literalsIn(property.initializer);
      const physical =
        key === "text-align" || key === "float"
          ? values.some((value) => isViolation(key, value))
          : true;
      if (!physical) return [];
      const line = file.getLineAndCharacterOfPosition(property.getStart(file)).line + 1;
      return [`${name}:${line} — ${key}`];
    }),
  );
}

const sources = components(SRC);

describe("direction-agnostic authoring", () => {
  test("no stylesheet uses a property that will not mirror", () => {
    // A clean result is only trustworthy if the scan saw the stylesheets: an
    // empty list has no violations for the same reason a correct one does not.
    expect(files.length).toBeGreaterThan(10);

    expect(files.flatMap(physicalIn).sort()).toEqual([]);
  });

  test("the pattern reports a physical property, and spares its logical twin", () => {
    const found = (css: string) =>
      [...css.matchAll(PHYSICAL)].filter(([, p, v]) => isViolation(p, v));

    expect(found(".a { margin-left: 4px; }")).toHaveLength(1);
    expect(found(".a { text-align: right; }")).toHaveLength(1);
    expect(found(".a { right: 0; }")).toHaveLength(1);

    expect(found(".a { margin-inline-start: 4px; }")).toHaveLength(0);
    expect(found(".a { text-align: start; }")).toHaveLength(0);
    expect(found(".a { inset-inline-end: 0; }")).toHaveLength(0);
    expect(found(".a { border-radius: 4px; }")).toHaveLength(0);
  });

  test("no inline style uses a property that will not mirror", () => {
    // The same guard as the stylesheets': an empty scan has no violations either.
    expect(sources.length).toBeGreaterThan(10);

    const found = sources.flatMap((file) =>
      inlinePhysicalIn(relative(SRC, file).split(sep).join("/"), readFileSync(file, "utf8")),
    );
    expect(found.sort()).toEqual([]);
  });

  test("the inline reading reports a physical key, and spares its logical twin", () => {
    const found = (source: string) => inlinePhysicalIn("fixture.tsx", source);

    expect(found(`<div style={{ marginLeft: 4 }} />`)).toHaveLength(1);
    expect(found(`<div style={{ borderRightWidth: 1 }} />`)).toHaveLength(1);
    expect(found(`<div style={{ textAlign: "right" }} />`)).toHaveLength(1);
    expect(found(`<div style={open ? { left: 0 } : undefined} />`)).toHaveLength(1);
    expect(found(`customProperties({ "--x": "1" }, { paddingRight: 2 })`)).toHaveLength(1);
    expect(found(`<div style={{ left }} />`)).toHaveLength(1);
    expect(found(`<div style={{ textAlign: end ? "right" : "start" }} />`)).toHaveLength(1);

    expect(found(`<div style={{ marginInlineStart: 4 }} />`)).toHaveLength(0);
    expect(found(`<div style={{ marginInlineStart }} />`)).toHaveLength(0);
    expect(found(`<div style={{ textAlign: end ? "end" : "start" }} />`)).toHaveLength(0);
    expect(found(`<div style={{ textAlign: "start" }} />`)).toHaveLength(0);
    expect(found(`<div style={{ borderRadius: 4 }} />`)).toHaveLength(0);
    expect(found(`<div style={{ "--edge": "left" }} />`)).toHaveLength(0);
    expect(found(`<div className={{ marginLeft: 4 }} />`)).toHaveLength(0);
  });
});
