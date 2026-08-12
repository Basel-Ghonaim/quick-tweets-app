import { prisma, type DbClient } from "../database/index.js";

export interface ResolvedHandle {
  userId: number;
  /** The user's CURRENT (canonical) username. */
  canonicalUsername: string;
  /** True when `handle` matched a former (reserved alias) username, not the current one. */
  viaAlias: boolean;
}

/**
 * The single source of truth for username → user resolution. Resolves a handle by
 * the CURRENT username first, then by a reserved alias (a former handle released
 * on a rename). Every username locator composes this one function, so alias
 * resolution can never diverge between features.
 */
export const resolveUserByHandle = async (
  handle: string,
  client: DbClient = prisma,
): Promise<ResolvedHandle | null> => {
  const current = await client.user.findUnique({
    where: { username: handle },
    select: { id: true, username: true },
  });
  if (current) {
    return { userId: current.id, canonicalUsername: current.username, viaAlias: false };
  }

  const alias = await client.usernameAlias.findUnique({
    where: { username: handle },
    select: { user: { select: { id: true, username: true } } },
  });
  if (alias) {
    return { userId: alias.user.id, canonicalUsername: alias.user.username, viaAlias: true };
  }

  return null;
};
