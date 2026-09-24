import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The documentation set's own integrity, held mechanically.
 *
 * Both rules below were enforced by hand until they failed by hand. A finding
 * numbered twice merges silently, because two branches write two different
 * filenames and git reports no conflict — it happened twice in one week. And a
 * finding that moves between `open/` and `resolved/` breaks every relative link
 * that reached it, which is [Finding 0037](../docs/architecture/findings/open/0037-moving-a-finding-breaks-links-from-outside-the-repository.md)
 * for links outside the repository and was simply unwatched for links inside it.
 *
 * Repository-level, like its neighbour: the documentation set belongs to no
 * application, so neither does the check that holds it.
 */

const ROOT = process.cwd();
const DOCS = join(ROOT, "docs");
const FINDINGS = join(DOCS, "architecture", "findings");

const label = (file: string) => relative(ROOT, file).split(sep).join("/");

/** Every `.md` the repository owns: the documentation set, and the bootstrap. */
const markdownUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return markdownUnder(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });

const documents = [...markdownUnder(DOCS), join(ROOT, "CLAUDE.md")];

// ── Finding numbers ──────────────────────────────────────────────────────────

const FINDING_FILE = /^(\d{4})-[a-z0-9-]+\.md$/;

const findingsIn = (status: "open" | "resolved") =>
  readdirSync(join(FINDINGS, status)).filter((name) => name.endsWith(".md"));

describe("finding numbers", () => {
  test("every finding is named so its number can be read", () => {
    const all = [...findingsIn("open"), ...findingsIn("resolved")];

    // A clean result is only trustworthy if the scan saw the register.
    expect(all.length).toBeGreaterThan(20);

    expect(all.filter((name) => !FINDING_FILE.test(name)).sort()).toEqual([]);
  });

  test("no number is used twice, across both statuses", () => {
    const seen = new Map<string, string[]>();

    for (const status of ["open", "resolved"] as const)
      for (const name of findingsIn(status)) {
        const number = FINDING_FILE.exec(name)?.[1];
        if (!number) continue;
        seen.set(number, [...(seen.get(number) ?? []), `${status}/${name}`]);
      }

    expect(seen.size).toBeGreaterThan(20);

    // Two branches open at once pick the same next number, and nothing collides
    // in git because the slugs differ. This is the only place that would notice.
    const reused = [...seen.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([number, files]) => `${number} — ${files.sort().join(", ")}`);

    expect(reused.sort()).toEqual([]);
  });
});

// ── Links between documents ──────────────────────────────────────────────────

/**
 * Code is not prose, and a shell line can be link-shaped: an indented
 * PowerShell block writing PNG magic bytes is the one that made this necessary.
 * Fences are matched with their indentation, because a fence inside a list
 * item has some, and an unindented pattern walks straight past it.
 */
const withoutCode = (text: string) =>
  text
    .replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, "")
    .replace(/`[^`\n]*`/g, "");


/** A markdown link to a path, rather than to the web or an address. */
const LINK = /\]\((?!https?:|mailto:|#)([^)\s]+?)(#[^)]*)?\)/g;

const linksIn = (file: string) => {
  const text = withoutCode(readFileSync(file, "utf8"));
  return [...text.matchAll(LINK)].map((match) => match[1]);
};

describe("links between documents", () => {
  test("every relative link resolves to something that exists", () => {
    const scanned = documents.flatMap((file) =>
      linksIn(file).map((target) => ({ file, target })),
    );

    // A clean result is only trustworthy if the scan saw the documents.
    expect(documents.length).toBeGreaterThan(50);
    expect(scanned.length).toBeGreaterThan(500);

    const broken = scanned
      .filter(({ file, target }) => !existsSync(resolve(file, "..", target)))
      .map(({ file, target }) => `${label(file)} — ${target}`);

    expect(broken.sort()).toEqual([]);
  });
});
