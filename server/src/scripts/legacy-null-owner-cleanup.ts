/**
 * WI-5 CLI — bounded legacy `uploader_id IS NULL` cleanup (ADR 0008 D12, #367).
 *
 *   npm run media:legacy-cleanup -- --report [--out <manifest.json>] [--review-out <review.json>]
 *   npm run media:legacy-cleanup -- --execute --manifest <file> --confirm <digest>
 *                                   [--out <run-report.json>] [--review <review.json>]
 *
 * `--report` is READ-ONLY. It writes two artifacts:
 *   - the **sensitive manifest** (`--out`, default wi5-manifest.json) — sealed with
 *     a SHA-256 digest; contains the exact values execution needs (token/storageKey).
 *     Keep it local; it is gitignored.
 *   - the **sanitized review report** (`--review-out`, default wi5-review-report.json)
 *     — no tokens/storage keys; safe to attach to the Issue / commit as evidence.
 *
 * `--execute` is DESTRUCTIVE and manifest-bound — it deletes only the manifest's
 * candidates, each re-validated live under lock, and requires `--confirm <digest>`
 * plus a matching live DB fingerprint. Run it only after a human has reviewed the
 * exact manifest. With `--review <file>` it folds the execution outcome back into
 * the sanitized review report (the durable "what happened").
 */

import { readFile, writeFile } from "node:fs/promises";

import { prisma } from "../shared/database/index.js";
import { createStorageAdapter } from "../modules/media/index.js";
import {
  buildManifest,
  buildReviewReport,
  executeManifest,
  readFingerprint,
  selectLegacy,
  withExecution,
  type CleanupManifest,
  type ReviewReport,
} from "../modules/media/media.legacy-cleanup.js";

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (name: string): boolean => process.argv.includes(name);

const report = async (): Promise<void> => {
  const storage = createStorageAdapter();
  const target = await readFingerprint();
  const { candidates, anomalies } = await selectLegacy(storage);
  const manifest = buildManifest(candidates, anomalies, target, new Date().toISOString());
  const review = buildReviewReport(manifest);

  const manifestOut = arg("--out") ?? "wi5-manifest.json";
  const reviewOut = arg("--review-out") ?? "wi5-review-report.json";
  await writeFile(manifestOut, JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(reviewOut, JSON.stringify(review, null, 2), "utf8");

  console.log(`[WI-5 report] READ-ONLY — nothing was mutated`);
  console.log(`  target: db=${target.database} systemIdentifier=${target.systemIdentifier} oid=${target.databaseOid} server=${target.serverAddr}:${target.serverPort}`);
  console.log(`  candidates: ${candidates.length}`);
  for (const c of manifest.candidates) {
    console.log(`    id=${c.id} status=${c.status} size=${c.size} bytesPresent=${c.bytesPresent}`);
  }
  console.log(`  anomalies: ${anomalies.length}`);
  for (const a of manifest.anomalies) {
    console.log(`    id=${a.id} status=${a.status} reasons=[${a.reasons.join(", ")}]`);
  }
  console.log(`  digest: ${manifest.digest}`);
  console.log(`  sensitive manifest (gitignored): ${manifestOut}`);
  console.log(`  sanitized review report (shareable): ${reviewOut}`);
  if (anomalies.length > 0) {
    console.log("  NOTE: anomalies present — investigate before any --execute (they are excluded from the candidate set).");
  }
};

const execute = async (): Promise<void> => {
  const manifestPath = arg("--manifest");
  const confirm = arg("--confirm");
  if (!manifestPath) throw new Error("--execute requires --manifest <file>");
  if (!confirm) throw new Error("--execute requires --confirm <digest> (the reviewed manifest's digest)");

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as CleanupManifest;
  const storage = createStorageAdapter();
  const runReport = await executeManifest(manifest, confirm, storage);

  const out = arg("--out") ?? "wi5-run-report.json";
  await writeFile(out, JSON.stringify(runReport, null, 2), "utf8");

  // Fold the outcome into the durable sanitized review report, if provided.
  const reviewPath = arg("--review");
  if (reviewPath) {
    const review = JSON.parse(await readFile(reviewPath, "utf8")) as ReviewReport;
    await writeFile(reviewPath, JSON.stringify(withExecution(review, runReport, new Date().toISOString()), null, 2), "utf8");
  }

  console.log(`[WI-5 execute] db=${runReport.target.database} systemIdentifier=${runReport.target.systemIdentifier} digest=${runReport.manifestDigest}`);
  for (const o of runReport.outcomes) {
    console.log(`    id=${o.id} → ${o.state}${o.reason ? ` (${o.reason})` : ""}`);
  }
  console.log(`  COUNT(uploader_id IS NULL) after run: ${runReport.nullOwnerCountAfter}`);
  console.log(`  coverageComplete=${runReport.coverageComplete} clean=${runReport.clean} gateComplete=${runReport.gateComplete}`);
  console.log(`  run report written: ${out}${reviewPath ? ` (review updated: ${reviewPath})` : ""}`);
  if (!runReport.gateComplete) {
    console.log("  GATE NOT COMPLETE — WI-7 (NOT NULL) must not proceed until every candidate is deleted/already_completed and COUNT = 0.");
  }
};

const main = async (): Promise<void> => {
  if (has("--report") === has("--execute")) {
    throw new Error("specify exactly one of --report or --execute");
  }
  if (has("--report")) await report();
  else await execute();
};

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err: unknown) => {
    console.error(`[WI-5] ${err instanceof Error ? err.message : String(err)}`);
    await prisma.$disconnect();
    process.exit(1);
  });
