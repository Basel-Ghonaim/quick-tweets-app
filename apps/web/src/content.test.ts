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
  "revealLabel",
  "errorMessage",
  "loadingText",
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

// A catalogue constant, or an accessor called while a module loads, would hold one language's words for the
// life of the page; production reads through the accessors, and only the composition root holds the registry.
const ACCESSORS = new Set(["useCopy", "currentCopy", "CATALOGUES", "Catalogue"]);
const READERS = new Set(["useCopy", "currentCopy"]);

// The mechanism's readers are generic, so only the catalogue that types them may call them. The check
// sees direct calls only: a helper that reads, called while the module loads, is left to review.
const LOCALISATION = "shared/localisation";
const GENERIC_READERS = new Set(["currentCatalogue", "useCatalogue"]);
const inLocalisation = (l: string) => l === LOCALISATION || l.startsWith(`${LOCALISATION}/`);

const insideFunction = (node: ts.Node): boolean => {
  for (let p = node.parent; p && !ts.isSourceFile(p); p = p.parent) if (ts.isFunctionLike(p)) return true;
  return false;
};

const catalogueReadsIn = (l: string, text: string): string[] => {
  if (inCatalogue(l)) return [];

  const sf = parse(l, text);
  const found: string[] = [];
  const readers = new Set<string>();
  const reachesCatalogue = (node: ts.Node | undefined) => {
    const target = node && ts.isStringLiteral(node) ? targetOf(node.text, l) : null;
    return target !== null && inCatalogue(target);
  };
  const reachesLocalisation = (node: ts.Node | undefined) => {
    const target = node && ts.isStringLiteral(node) ? targetOf(node.text, l) : null;
    return target !== null && inLocalisation(target) && !inLocalisation(l);
  };
  const genericReadersIn = (bindings: ts.NamedImports | ts.NamedExports) =>
    bindings.elements
      .map((element) => (element.propertyName ?? element.name).text)
      .filter((name) => GENERIC_READERS.has(name))
      .forEach((name) => found.push(`${l} — ${name}`));

  sf.statements.filter(ts.isImportDeclaration).forEach((node) => {
    if (reachesLocalisation(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) found.push(`${l} — the localisation mechanism as a whole`);
      else if (bindings) genericReadersIn(bindings);
      return;
    }
    if (!reachesCatalogue(node.moduleSpecifier)) return;
    const bindings = node.importClause?.namedBindings;
    if (!bindings || node.importClause?.name || ts.isNamespaceImport(bindings)) {
      found.push(`${l} — the catalogue as a whole`);
      return;
    }
    bindings.elements.forEach((element) => {
      const imported = (element.propertyName ?? element.name).text;
      if (!ACCESSORS.has(imported) || (imported === "CATALOGUES" && !l.startsWith("app/")))
        found.push(`${l} — ${imported}`);
      else if (READERS.has(imported)) readers.add(element.name.text);
    });
  });

  const visit = (node: ts.Node): void => {
    if (ts.isExportDeclaration(node) && reachesCatalogue(node.moduleSpecifier)) found.push(`${l} — re-exported`);
    else if (ts.isExportDeclaration(node) && reachesLocalisation(node.moduleSpecifier)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) genericReadersIn(node.exportClause);
      else found.push(`${l} — the localisation mechanism as a whole`);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && reachesCatalogue(node.arguments[0]))
      found.push(`${l} — the catalogue as a whole`);
    else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && readers.has(node.expression.text) && !insideFunction(node))
      found.push(`${l} — ${node.expression.text}() while the module loads`);
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
};

// The shape is English's own, so the source language may not import it and the shape may reach
// nothing else: a language folder reaching further is the cycle those two modules exist to prevent.
// The folders are read from the catalogue rather than listed, so the next language is reached too.
const SOURCE_LANGUAGE = "shared/copy/english";
const SHAPE = "shared/copy/shape";
const LANGUAGE_FOLDERS = readdirSync(join(SRC, CATALOGUE), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `${CATALOGUE}/${entry.name}`);

const reachableFrom = (l: string): ((target: string) => boolean) | null => {
  if (l === `${SHAPE}.ts`) return (target) => target === SOURCE_LANGUAGE;

  const folder = LANGUAGE_FOLDERS.find((candidate) => l.startsWith(`${candidate}/`));
  if (!folder) return null;

  // Its own folder's barrel is what assembles it, so reaching that is the same cycle one level down.
  return (target) =>
    (target.startsWith(`${folder}/`) && target !== `${folder}/index`) ||
    target === LOCALISATION ||
    (target === SHAPE && folder !== SOURCE_LANGUAGE);
};

const catalogueCyclesIn = (l: string, text: string): string[] => {
  const reachable = reachableFrom(l);
  if (!reachable) return [];

  return specifiersIn(parse(l, text))
    .filter((spec) => {
      const target = targetOf(spec, l);
      return target !== null && !reachable(target);
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

  test("production reads the catalogue through its accessors, and never while a module loads", () => {
    const consumers = production.filter((l) => !inCatalogue(l));
    const reading = consumers.filter((l) => /\b(useCopy|currentCopy)\(/.test(read(l)));
    expect(reading.length).toBeGreaterThan(25);

    expect(consumers.flatMap((l) => catalogueReadsIn(l, read(l))).sort()).toEqual([]);
  });

  test("a constant, the whole catalogue, or a read while loading is reported, and a read when needed is not", () => {
    const f = "features/x/y.tsx";
    const found = (source: string) => catalogueReadsIn(f, source);

    expect(found(`import { AUTH_COPY } from "@shared/copy";`)).toEqual([`${f} — AUTH_COPY`]);
    expect(found(`import { CATALOGUES } from "@shared/copy";`)).toEqual([`${f} — CATALOGUES`]);
    expect(found(`import { CONTROL_COPY } from "../../shared/copy/controls";`)).toHaveLength(1);
    expect(found(`import * as copy from "@shared/copy";`)).toHaveLength(1);
    expect(found(`import copy from "@shared/copy";`)).toHaveLength(1);
    expect(found(`export { ERROR_COPY } from "@shared/copy";`)).toHaveLength(1);
    expect(found(`const load = () => import("@shared/copy");`)).toHaveLength(1);
    expect(found(`import { currentCopy } from "@shared/copy";\nconst words = currentCopy().auth;`)).toHaveLength(1);
    expect(found(`import { useCopy as copyOf } from "@shared/copy";\nconst words = copyOf();`)).toHaveLength(1);

    expect(found(`import { useCopy, type Catalogue } from "@shared/copy";\nexport const A = () => useCopy().auth;`)).toHaveLength(0);
    const root = `import { CATALOGUES, currentCopy } from "@shared/copy";\nexport function b() { return [CATALOGUES, currentCopy()]; }`;
    expect(catalogueReadsIn("app/bootstrap.ts", root)).toHaveLength(0);
    expect(catalogueReadsIn("shared/copy/catalogue.ts", `import { AUTH_COPY } from "./auth";`)).toHaveLength(0);
  });

  test("the mechanism's generic readers are reported outside the catalogue, and its other exports are not", () => {
    const f = "features/x/y.tsx";
    const found = (source: string) => catalogueReadsIn(f, source);

    expect(found(`import { currentCatalogue } from "@shared/localisation";`)).toEqual([`${f} — currentCatalogue`]);
    expect(found(`import { useCatalogue as words } from "../../shared/localisation";`)).toHaveLength(1);
    expect(found(`import * as localisation from "@shared/localisation";`)).toHaveLength(1);
    expect(found(`export { useCatalogue } from "@shared/localisation";`)).toHaveLength(1);
    expect(found(`export * from "@shared/localisation";`)).toHaveLength(1);

    expect(found(`import { formatsFor } from "@shared/localisation";`)).toHaveLength(0);
    const root = `import { setupLocalisation } from "@shared/localisation";`;
    expect(catalogueReadsIn("app/bootstrap.ts", root)).toHaveLength(0);
    const typed = `import { currentCatalogue, useCatalogue } from "@shared/localisation";`;
    expect(catalogueReadsIn("shared/copy/catalogue.ts", typed)).toHaveLength(0);
    const own = `export { currentCatalogue, setupLocalisation, useCatalogue } from "./catalogues";`;
    expect(catalogueReadsIn("shared/localisation/index.ts", own)).toHaveLength(0);
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

describe("the catalogue's own imports", () => {
  test("a language folder reaches its own words, the shape and the mechanism, and nothing else", () => {
    const words = production.filter((l) => reachableFrom(l) !== null);
    // A language the scan did not see is a language the rule did not reach, and the shape is
    // recognised by its name, so a rename would take its half of the rule with it.
    expect(LANGUAGE_FOLDERS.length).toBeGreaterThan(1);
    for (const folder of LANGUAGE_FOLDERS)
      expect(words.filter((l) => l.startsWith(`${folder}/`)).length).toBeGreaterThan(5);
    expect(words).toContain(`${SHAPE}.ts`);

    expect(words.flatMap((l) => catalogueCyclesIn(l, read(l))).sort()).toEqual([]);
  });

  test("a reach past a language folder is reported, and the shape's one import is not", () => {
    const arabic = "shared/copy/arabic/auth/verify.ts";
    const english = "shared/copy/english/controls.ts";

    expect(catalogueCyclesIn(arabic, `import type { C } from "../../catalogues";`)).toHaveLength(1);
    expect(catalogueCyclesIn(arabic, `import { E } from "../../english";`)).toHaveLength(1);
    expect(catalogueCyclesIn(arabic, `import { C } from "@shared/copy";`)).toHaveLength(1);
    expect(catalogueCyclesIn(arabic, `type C = typeof import("../../index");`)).toHaveLength(1);
    // Its own folder's barrel assembles it, so reaching that is the same cycle one level down.
    expect(catalogueCyclesIn(arabic, `import { ARABIC } from "../index";`)).toHaveLength(1);
    // English is where the shape comes from, so importing it is the cycle in the other direction.
    expect(catalogueCyclesIn(english, `import type { C } from "../shape";`)).toHaveLength(1);

    expect(catalogueCyclesIn(arabic, `import type { C } from "../../shape";`)).toHaveLength(0);
    expect(catalogueCyclesIn(arabic, `import { ARABIC_FORMATS } from "../formats";`)).toHaveLength(0);
    expect(catalogueCyclesIn(arabic, `import { formatsFor } from "@shared/localisation";`)).toHaveLength(0);
    expect(catalogueCyclesIn(english, `import { ENGLISH_FORMATS } from "./formats";`)).toHaveLength(0);
    expect(catalogueCyclesIn("shared/copy/shape.ts", `import type { ENGLISH } from "./english";`)).toHaveLength(0);
    expect(catalogueCyclesIn("shared/copy/shape.ts", `import { ARABIC } from "./arabic";`)).toHaveLength(1);
    expect(catalogueCyclesIn("shared/copy/catalogues.ts", `import { ARABIC } from "./arabic";`)).toHaveLength(0);
  });
});
