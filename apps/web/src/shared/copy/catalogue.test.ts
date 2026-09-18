import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { CATALOGUES, type Catalogue } from "./catalogue";

const english = CATALOGUES.en;

const MODULE = join(process.cwd(), "src/shared/copy/catalogue.ts");
const REGISTERED = "export const CATALOGUES = registry({ en: ENGLISH });";

// The module is typechecked with one more language registered, built as a translation will be: from
// constants, where no excess-property check reaches. Returns what the compiler says about that copy.
const registering = (() => {
  const { options } = ts.getParsedCommandLineOfConfigFile(join(process.cwd(), "tsconfig.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
  })!;
  const copy = MODULE.replace("catalogue.ts", "catalogue.registering.ts").split("\\").join("/");
  const source = readFileSync(MODULE, "utf8");
  if (source.split(REGISTERED).length !== 2) throw new Error("the registry is not declared as expected");
  let previous: ts.Program | undefined;

  return (declarations: string): string[] => {
    const registered = `${declarations}\nexport const CATALOGUES = registry({ en: ENGLISH, xx: XX });`;
    const text = source.replace(REGISTERED, () => registered);
    const host = ts.createCompilerHost(options);
    const { fileExists, readFile } = host;
    host.fileExists = (file) => file.split("\\").join("/") === copy || fileExists(file);
    host.readFile = (file) => (file.split("\\").join("/") === copy ? text : readFile(file));
    previous = ts.createProgram([copy], options, host, previous);
    const file = previous.getSourceFile(copy);
    return ts
      .getPreEmitDiagnostics(previous, file)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  };
})();

describe("the catalogues", () => {
  test("English is registered, and is a whole catalogue", () => {
    // The annotation is the proof, and the typecheck lane holds it; this assertion cannot fail.
    const whole: Catalogue = english;

    expect(Object.keys(CATALOGUES)).toContain("en");
    expect(whole).toBe(english);
  });

  test("a catalogue that drifts from English's shape does not compile", () => {
    // The typecheck lane is the proof: each directive fails it unless its line errs. Each fixture is
    // used below, so an unused-variable error cannot stand in for the one it names.
    // @ts-expect-error a line is missing
    const missing: Catalogue = { ...english, placeholder: { notBuiltTitle: english.placeholder.notBuiltTitle, notBuiltBody: english.placeholder.notBuiltBody, unknownTitle: english.placeholder.unknownTitle } };
    // @ts-expect-error a line English does not have
    const extra: Catalogue = { ...english, footer: "Made with care" };
    // @ts-expect-error a line takes different values
    const reshaped: Catalogue = { ...english, auth: { ...english.auth, verify: { ...english.auth.verify, resendIn: (seconds: string) => seconds } } };

    expect([missing, extra, reshaped]).toHaveLength(3);
  });

  test("a catalogue assembled from constants is registered only without lines English lacks", () => {
    expect(registering("const AUTH = { ...AUTH_COPY };\nconst XX = { ...ENGLISH, auth: AUTH };")).toEqual([]);

    const atTheTop = registering(`const XX = { ...ENGLISH, footer: "Made with care" };`);
    const deepDown = registering(
      [
        `const VERIFY = { ...AUTH_COPY.verify, footer: "Made with care" };`,
        "const XX = { ...ENGLISH, auth: { ...AUTH_COPY, verify: VERIFY } };",
      ].join("\n"),
    );

    expect(atTheTop.join("\n")).toContain('extraLine: "footer"');
    expect(deepDown.join("\n")).toContain('extraLine: "footer"');
  }, 30_000);
});
