import { prisma, type DbClient } from "../database/index.js";

/**
 * The two facts a Follow button needs about one person, from the reader's side.
 *
 * Both are `false` for a guest, and both are `false` on the reader's own row —
 * following yourself is refused, so the pair cannot say otherwise. *Which* of the
 * four states the button draws is the client's to derive: `following` from
 * `isFollowing`, `follow back` from `followsYou` alone, and your own row from the
 * ids it already holds. The server deliberately reports no third field, because a
 * pre-computed relation would put a presentation choice in the payload.
 */
export interface FollowState {
  /** The reader follows this person. */
  isFollowing: boolean;
  /** This person follows the reader. */
  followsYou: boolean;
}

/** Neither direction — a guest, or a person nobody asked about. */
export const NO_FOLLOW_STATE: FollowState = { isFollowing: false, followsYou: false };

/**
 * The single source of truth for reader → person follow state, for one page of
 * people at a time. Every surface that draws a Follow button composes this one
 * function, so the two directions can never diverge between features — the same
 * reason username resolution lives beside it in `shared/identity`.
 *
 * **One query for the whole page, never one per row.** Both arms of the `OR` lead
 * with `followerId`, so the unique `(follower_id, following_id)` index serves
 * both: the first as a range under the reader, the second as one probe per person
 * on the page. No index exists for this beyond the one the constraint already
 * provides.
 *
 * A guest asks nothing at all — there is no reader to be related to, so the query
 * is skipped rather than run and discarded.
 */
export const resolveFollowState = async (
  readerId: number | undefined,
  personIds: readonly number[],
  client: DbClient = prisma,
): Promise<ReadonlyMap<number, FollowState>> => {
  const unique = [...new Set(personIds)];
  if (readerId === undefined || unique.length === 0) {
    return new Map();
  }

  const edges = await client.follow.findMany({
    where: {
      OR: [
        { followerId: readerId, followingId: { in: unique } },
        { followerId: { in: unique }, followingId: readerId },
      ],
    },
    select: { followerId: true, followingId: true },
  });

  const state = new Map<number, FollowState>(
    unique.map((id) => [id, { isFollowing: false, followsYou: false }]),
  );

  for (const edge of edges) {
    if (edge.followerId === readerId) {
      // reader → person
      const entry = state.get(edge.followingId);
      if (entry) entry.isFollowing = true;
    }
    if (edge.followingId === readerId) {
      // person → reader
      const entry = state.get(edge.followerId);
      if (entry) entry.followsYou = true;
    }
  }

  return state;
};

/** The state for one person, defaulting to neither direction when absent. */
export const followStateOf = (
  state: ReadonlyMap<number, FollowState>,
  personId: number,
): FollowState => state.get(personId) ?? NO_FOLLOW_STATE;
