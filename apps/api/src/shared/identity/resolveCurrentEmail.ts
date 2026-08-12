import { prisma, type DbClient } from "../database/index.js";

/**
 * The account's current email address, by id.
 *
 * Kept beside username resolution so identity lookups have one home rather than
 * each consumer reaching into `users` for itself. Returns `null` when no such
 * account exists, so a caller decides what a missing account means rather than
 * receiving a fabricated value.
 */
export const resolveCurrentEmail = async (
  userId: number,
  client: DbClient = prisma,
): Promise<string | null> => {
  const account = await client.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return account?.email ?? null;
};
