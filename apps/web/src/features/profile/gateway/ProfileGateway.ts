import type { ProfileEdits, UpdatedProfile } from "../model";

export interface ProfileGateway {
  updateProfile: (edits: ProfileEdits) => Promise<UpdatedProfile>;
  /** Answers the reference the update carries, which is all profile keeps of a
   *  picture. */
  uploadAvatar: (file: File) => Promise<string>;
}
