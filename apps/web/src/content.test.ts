import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

// Words are content passed inward (ADR 0018 Decision 6), held by a check with no exemption
// list: one that accepts a member is how a rule becomes the exception it was written against.

const SRC = join(process.cwd(), "src");
const CATALOGUE = "shared/copy";

const ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "title",
  "placeholder",
  "alt",
  "label",
  "helperText",
]);

const PROPERTIES = new Set([
  "label",
  "placeholder",
  "helperText",
  "message",
  "defaultMessage",
  "description",
  "error",
  "title",
]);

// A lowercase letter separates a sentence from `PDF`; a single lowercase token is a value such
// as `"outlined"`, never a line a reader meets.
const isWords = (text: string) => /[a-z]/.test(text) && !/^[a-z][a-z0-9-]*$/.test(text);

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const label = (file: string) => relative(SRC, file).split(sep).join("/");
const isProduction = (l: string) =>
  /\.tsx?$/.test(l) && !/\.(test|spec)\.tsx?$|\.stories\.tsx$/.test(l);
const inCatalogue = (l: string) => l === CATALOGUE || l.startsWith(`${CATALOGUE}/`);
const read = (l: string) => readFileSync(join(SRC, l), "utf8");

const production = filesUnder(SRC).map(label).filter(isProduction);

const parse = (l: string, text: string) =>
  ts.createSourceFile(
    l,
    text,
    ts.ScriptTarget.Latest,
    true,
    l.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

const nameOf = (name: ts.PropertyName) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;

// A template's fixed parts are joined with a space, so one holding a substitution is never
// mistaken for a single token.
const wordsOf = (node: ts.Node): string | null => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node))
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  return null;
};

const CHOOSING = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
]);

// A value is read through whatever only chooses or annotates it, so a conditional cannot hide a word.
const literalsIn = (node: ts.Node | undefined): ts.Node[] => {
  if (!node) return [];
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  )
    return literalsIn(node.expression);
  if (ts.isConditionalExpression(node))
    return [...literalsIn(node.whenTrue), ...literalsIn(node.whenFalse)];
  if (ts.isBinaryExpression(node) && CHOOSING.has(node.operatorToken.kind))
    return [...literalsIn(node.left), ...literalsIn(node.right)];
  return wordsOf(node) === null ? [] : [node];
};

const ASSIGNING = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

// The defaults in a destructuring assignment's target, however deeply it nests; a
// shorthand default (`{ label = "…" } = props`) is its own node and is read where it stands.
const defaultsIn = (target: ts.Expression): ts.Expression[] => {
  if (ts.isArrayLiteralExpression(target)) return target.elements.flatMap(defaultsIn);
  if (ts.isObjectLiteralExpression(target))
    return target.properties.flatMap((p) => (ts.isPropertyAssignment(p) ? defaultsIn(p.initializer) : []));
  if (ts.isBinaryExpression(target) && target.operatorToken.kind === ts.SyntaxKind.EqualsToken)
    return [target.right, ...defaultsIn(target.left)];
  return [];
};

const assignedName = (target: ts.Expression): string | null => {
  if (ts.isPropertyAccessExpression(target)) return target.name.text;
  if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression))
    return target.argumentExpression.text;
  return null;
};

const isDeveloperFacing = (node: ts.Node, sf: ts.SourceFile): boolean => {
  for (let p = node.parent; p && !ts.isSourceFile(p); p = p.parent) {
    if (ts.isThrowStatement(p) || ts.isImportDeclaration(p)) return true;
    if (ts.isNewExpression(p) && /Error$/.test(p.expression.getText(sf))) return true;
    if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf))) return true;
  }
  return false;
};

const wordsIn = (l: string, text: string): string[] => {
  const sf = parse(l, text);
  const found: string[] = [];
  const seen = new Set<ts.Node>();

  const report = (node: ts.Node, words: string) => {
    if (seen.has(node) || !isWords(words) || isDeveloperFacing(node, sf)) return;
    seen.add(node);
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    found.push(`${l}:${line} — ${JSON.stringify(words.trim())}`);
  };
  const reportValue = (value: ts.Node | undefined) =>
    literalsIn(value).forEach((literal) => report(literal, wordsOf(literal) ?? ""));

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) report(node, node.text);
    // A child in braces renders as text too, so braces are no way around the rule.
    else if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)))
      reportValue(node.expression);
    else if (ts.isJsxAttribute(node) && ATTRIBUTES.has(node.name.getText(sf)))
      reportValue(
        node.initializer && ts.isJsxExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer,
      );
    else if (
      (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) &&
      PROPERTIES.has(nameOf(node.name) ?? "")
    )
      reportValue(node.initializer);
    else if ((ts.isParameter(node) || ts.isBindingElement(node)) && node.initializer)
      reportValue(node.initializer);
    else if (ts.isShorthandPropertyAssignment(node)) reportValue(node.objectAssignmentInitializer);
    else if (ts.isBinaryExpression(node) && ASSIGNING.has(node.operatorToken.kind)) {
      if (ts.isObjectLiteralExpression(node.left) || ts.isArrayLiteralExpression(node.left))
        defaultsIn(node.left).forEach(reportValue);
      else if (PROPERTIES.has(assignedName(node.left) ?? "")) reportValue(node.right);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
};

const specifiersIn = (sf: ts.SourceFile): string[] => {
  const found: string[] = [];
  const named = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteral(node)) found.push(node.text);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) named(node.moduleSpecifier);
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
      named(node.arguments[0]);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      named(node.argument.literal);
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
};

// Resolved rather than matched as text, so a relative path reaches the verdict an alias does.
const targetOf = (spec: string, l: string): string | null => {
  const alias = spec.match(/^@(app|pages|features|shared)(\/.*)?$/);
  if (alias) return alias[1] + (alias[2] ?? "");
  if (!spec.startsWith(".")) return null;

  const abs = resolve(SRC, dirname(l), spec);
  return abs.startsWith(SRC + sep) ? label(abs) : null;
};

const catalogueImportsIn = (l: string, text: string): string[] => {
  if (!l.startsWith("shared/") || inCatalogue(l)) return [];

  return specifiersIn(parse(l, text))
    .filter((spec) => {
      const target = targetOf(spec, l);
      return target !== null && inCatalogue(target);
    })
    .map((spec) => `${l} — ${spec}`);
};

describe("user-facing content", () => {
  test("no production file outside the catalogue holds a user-facing word", () => {
    // A clean result is only trustworthy if the scan saw the source.
    const scanned = production.filter((l) => !inCatalogue(l));
    expect(scanned.length).toBeGreaterThan(250);

    expect(scanned.flatMap((l) => wordsIn(l, read(l))).sort()).toEqual([]);
  });

  test("nothing under shared/ but the catalogue imports it", () => {
    const mechanisms = production.filter((l) => l.startsWith("shared/") && !inCatalogue(l));
    expect(mechanisms.length).toBeGreaterThan(150);

    expect(mechanisms.flatMap((l) => catalogueImportsIn(l, read(l))).sort()).toEqual([]);
  });

  test("a word is reported wherever a reader meets it, and a token or a developer's string is not", () => {
    const found = (source: string) => wordsIn("fixture.tsx", source);

    expect(found(`const A = () => (\n  <p>Upload media</p>\n);`)).toEqual([
      'fixture.tsx:2 — "Upload media"',
    ]);
    expect(found(`const A = () => <p>{"Upload media"}</p>;`)).toHaveLength(1);
    expect(found(`const A = () => <>{"Upload media"}</>;`)).toHaveLength(1);
    expect(found(`const A = ({ n }) => <p>{n === 1 ? "One file" : \`\${n} files\`}</p>;`)).toHaveLength(2);
    ATTRIBUTES.forEach((name) =>
      expect(found(`const A = () => <b ${name}="Show password" />;`)).toHaveLength(1),
    );
    expect(found(`const A = ({ on }) => <b aria-label={on ? "Hide it" : "Show it"} />;`)).toHaveLength(2);
    expect(found(`const A = ({ name }) => <b title={name ?? "Your profile"} />;`)).toHaveLength(1);
    PROPERTIES.forEach((name) =>
      expect(found(`const c = { ${name}: "Show password" };`)).toHaveLength(1),
    );
    expect(found(`const c = { "label": "Show password" };`)).toHaveLength(1);
    expect(found(`const c = { label: "Show password" as const };`)).toHaveLength(1);
    expect(found(`const c = { title: ("Upload media" satisfies string) };`)).toHaveLength(1);
    expect(found(`const c = { message: \`Must be at most \${max} characters\` };`)).toHaveLength(1);
    expect(found(`class Q { title = "Upload media"; }`)).toHaveLength(1);
    expect(found(`input.placeholder = "Search tweets";`)).toHaveLength(1);
    expect(found(`input["title"] ??= "Search tweets";`)).toHaveLength(1);
    expect(found(`const f = (message = "This field is required") => message;`)).toHaveLength(1);
    expect(found(`const A = ({ label = "Drop files here" }) => label;`)).toHaveLength(1);
    expect(found(`({ label = "Drop files here" } = props);`)).toHaveLength(1);
    expect(found(`[[first = "Drop files here"] = []] = rows;`)).toHaveLength(1);
    expect(found(`const f = (width = \`\${n}px\`) => width;`)).toHaveLength(1);

    expect(found(`const A = ({ variant = "outlined", size = "body-medium" }) => null;`)).toHaveLength(0);
    expect(found(`const c = { label: "PDF", title: "KB" };`)).toHaveLength(0);
    expect(found(`const A = () => <div className="grid two-up" data-state="not ready" />;`)).toHaveLength(0);
    expect(found(`const c = { name: "Display name", hint: "One line is plenty." };`)).toHaveLength(0);
    expect(found(`throw { message: "No field named that" };`)).toHaveLength(0);
    expect(found(`const e = new FormError({ message: "No field named that" });`)).toHaveLength(0);
    expect(found(`console.table({ title: "Session state" });`)).toHaveLength(0);
  });

  test("a mechanism reaching the catalogue is reported by alias or by path, and a consumer is not", () => {
    const found = catalogueImportsIn;

    expect(found("shared/errors/x.ts", `import { ERROR_COPY } from "@shared/copy";`)).toHaveLength(1);
    expect(found("shared/errors/parsers/x.ts", `import type { C } from "../../copy/errors";`)).toHaveLength(1);
    expect(found("shared/errors/x.ts", `export { ERROR_COPY } from "@shared/copy/errors";`)).toHaveLength(1);
    expect(found("shared/errors/x.ts", `const load = () => import("../copy");`)).toHaveLength(1);
    expect(found("shared/errors/x.ts", `type Copy = typeof import("@shared/copy");`)).toHaveLength(1);

    expect(found("features/authentication/x.ts", `import { AUTH_COPY } from "@shared/copy";`)).toHaveLength(0);
    expect(found("app/bootstrap.ts", `import { ERROR_COPY } from "@shared/copy";`)).toHaveLength(0);
    expect(found("shared/copy/index.ts", `export { AUTH_COPY } from "./auth";`)).toHaveLength(0);
    expect(found("shared/errors/x.ts", `import { copyText } from "@shared/copying";`)).toHaveLength(0);
  });
});
