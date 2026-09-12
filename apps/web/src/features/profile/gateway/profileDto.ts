/** The wire shape. Each field's cleared form differs, and the server rejects
 *  the other one, so the three are not interchangeable. */
export interface UpdateProfileDto {
  /** Omitted = unchanged, `null` = clear, a string = set. `""` is rejected. */
  name?: string | null;
  /** Omitted = unchanged, `""` = clear. Not nullable. */
  bio?: string;
  /** Omitted = unchanged, `{ token }` = set, `null` = remove. */
  avatar?: { token: string } | null;
}

/** What this screen reads back from the update. The full self profile is the
 *  User domain's, and the capability asks for none of it. */
export interface ProfileResponseDto {
  username: string;
  name: string | null;
  bio: string;
}
