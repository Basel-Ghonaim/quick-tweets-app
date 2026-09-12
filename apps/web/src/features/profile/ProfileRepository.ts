import type { ProfileEdits, UpdatedProfile } from "./profile.types";

export interface ProfileRepository {
  updateProfile: (edits: ProfileEdits) => Promise<UpdatedProfile>;
}
