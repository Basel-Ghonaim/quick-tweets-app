import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { ProfileRepository } from "./ProfileRepository";
import { profileMapper } from "./profileMapper";
import type { ProfileResponseDto } from "./profileDto";

export const restProfile = (profileApi = authClient): ProfileRepository => {
  const { editsToDto, toUpdatedProfile } = profileMapper();

  return {
    updateProfile: async (edits) => {
      const res = await profileApi.patch<ApiEnvelope<ProfileResponseDto>>(
        "/users/me",
        editsToDto(edits),
      );
      return toUpdatedProfile(unwrap(res));
    },
  };
};
