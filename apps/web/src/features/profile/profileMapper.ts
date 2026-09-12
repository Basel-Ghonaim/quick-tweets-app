import type { ProfileEdits, UpdateProfileDto, UpdatedProfile } from "./model";

interface ProfileResponseDto {
  username: string;
  name: string | null;
  bio: string;
}

/**
 * The two text fields clear in opposite ways — `name` with `null` and `bio`
 * with `""` — and the server rejects each field's other form, so an empty
 * string is translated per field rather than passed through.
 */
export const profileMapper = () => ({
  editsToDto: (edits: ProfileEdits): UpdateProfileDto => {
    const dto: UpdateProfileDto = {};

    if (edits.name !== undefined) dto.name = edits.name.trim() || null;
    if (edits.bio !== undefined) dto.bio = edits.bio.trim();
    if (edits.avatarToken !== undefined) dto.avatar = { token: edits.avatarToken };

    return dto;
  },

  toUpdatedProfile: (data: ProfileResponseDto): UpdatedProfile => ({
    username: data.username,
    name: data.name,
    bio: data.bio,
  }),
});
