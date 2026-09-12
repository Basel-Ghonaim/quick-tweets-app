import type { ProfileEdits, UpdatedProfile } from "../model";

export interface ProfileGateway {
  updateProfile: (edits: ProfileEdits) => Promise<UpdatedProfile>;
}
