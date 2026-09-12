import type { ProfileEdits, UpdatedProfile } from "../model";
import type { ProfileResponseDto, UpdateProfileDto } from "./profileDto";

export interface ProfileMapper {
  editsToDto: (edits: ProfileEdits) => UpdateProfileDto;
  toUpdatedProfile: (data: ProfileResponseDto) => UpdatedProfile;
}

/**
 * The two text fields clear in opposite ways — `name` with `null` and `bio`
 * with `""` — and the server rejects each field's other form, so an empty
 * string is translated per field rather than passed through.
 */
export const profileMapper = (): ProfileMapper => ({
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
