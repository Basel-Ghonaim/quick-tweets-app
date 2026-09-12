import type { ProfileEdits } from "../model";

/**
 * A picture that failed contributes nothing rather than half of something: the
 * reference is carried only when the upload produced one.
 */
export const composeEdits = (
  values: { name: string; bio: string },
  avatarToken: string | null,
): ProfileEdits => {
  const edits: ProfileEdits = { name: values.name, bio: values.bio };
  if (avatarToken) edits.avatarToken = avatarToken;
  return edits;
};
