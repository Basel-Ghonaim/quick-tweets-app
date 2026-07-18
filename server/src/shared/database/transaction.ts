/**
 * Interactive-transaction unit-of-work helper.
 *
 * `runInTransaction(fn)` runs `fn` inside a single Prisma interactive
 * transaction and hands it the transaction-bound `DbClient`. Every write `fn`
 * performs with that client commits together or rolls back together — nothing
 * is persisted unless the whole callback resolves.
 *
 * It is injected (not called inline) so a service that orchestrates a
 * cross-module atomic operation stays testable without a live database: a test
 * passes a fake runner that simply invokes the callback with a stub client.
 */

import { prisma } from "./prisma.js";
import type { DbClient } from "./types.js";

/** Runs `fn` in one all-or-nothing interactive transaction. */
export type RunInTransaction = <T>(fn: (tx: DbClient) => Promise<T>) => Promise<T>;

export const runInTransaction: RunInTransaction = (fn) => prisma.$transaction(fn);
