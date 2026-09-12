import type { ProfileEdits, UpdatedProfile } from "./model";

export interface ProfileRepository {
  updateProfile: (edits: ProfileEdits) => Promise<UpdatedProfile>;
}
