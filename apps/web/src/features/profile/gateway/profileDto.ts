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
