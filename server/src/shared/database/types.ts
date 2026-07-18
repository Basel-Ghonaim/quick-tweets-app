/**
 * Shared database types.
 *
 * `DbClient` is a Prisma client usable *inside or outside* an interactive
 * transaction — it is the base client narrowed to the model delegates (it drops
 * connection/transaction-control methods). Repository methods accept it so the
 * same query runs against the singleton or against a `$transaction(async (tx) =>
 * …)` client, which is how a unit-of-work spanning more than one module (e.g.
 * register-with-avatar: create user + adopt media) stays atomic.
 */

import type { Prisma } from "../../generated/prisma/client.js";

/** A Prisma client bound either to the base connection or to an open transaction. */
export type DbClient = Prisma.TransactionClient;
