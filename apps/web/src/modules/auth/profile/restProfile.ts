import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { ProfileRepository } from "./ProfileRepository";
import { profileMapper } from "./profileMapper";

export const restProfile = (profileApi = authClient): ProfileRepository => {
  const { editsToDto, toUpdatedProfile } = profileMapper();

  return {
    updateProfile: async (edits) => {
      const res = await profileApi.patch<ApiEnvelope<Parameters<typeof toUpdatedProfile>[0]>>(
        "/users/me",
        editsToDto(edits),
      );
      return toUpdatedProfile(unwrap(res));
    },
  };
};
