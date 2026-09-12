/**
 * Profile update belongs to a Users feature that does not exist yet. It is
 * written here because the journey needs it, and kept self-contained so the
 * move is a directory move — the mechanism that will carry it is proposed
 * separately and deliberately not built.
 */

/** What the screen collects. A field the reader left alone is absent. */
export interface ProfileEdits {
  name?: string;
  bio?: string;
  avatarToken?: string;
}

/** Only what this screen reads back; the full self profile is the User domain's. */
export interface UpdatedProfile {
  username: string;
  name: string | null;
  bio: string;
}

/** How this screen ends, in profile's own words. The journey records its own
 *  outcome from it; the two vocabularies are not one. */
export type ProfileSettlement = "saved" | "skipped";
