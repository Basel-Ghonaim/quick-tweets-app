import type { AuthorEmbed } from "../types/index.js";

/** The author columns a repository selects for an embed. */
export interface AuthorRow {
  id: number;
  username: string;
  name: string | null;
  avatarMediaId: number | null;
}

/** The avatar references a set of authors holds, so a page resolves them in one batch. */
export const avatarReferencesOf = (authors: AuthorRow[]): number[] =>
  authors.flatMap((author) => (author.avatarMediaId === null ? [] : [author.avatarMediaId]));

/**
 * Only the resolved token reaches the wire (ADR 0005 Decision 3); an avatar that
 * did not resolve is `null`.
 */
export const toAuthorEmbed = (
  author: AuthorRow,
  tokens: ReadonlyMap<number, string>,
): AuthorEmbed => {
  const token = author.avatarMediaId === null ? undefined : tokens.get(author.avatarMediaId);
  return {
    id: author.id,
    username: author.username,
    name: author.name,
    avatar: token === undefined ? null : { token },
  };
};
