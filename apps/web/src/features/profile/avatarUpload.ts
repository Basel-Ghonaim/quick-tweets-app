import type { AvatarUploadStatus } from "./model";

export type { AvatarUploadStatus };

export interface AvatarUploadState {
  status: AvatarUploadStatus;
  /** The reference the profile update carries. Present only once uploaded. */
  token: string | null;
  /** The file in play, so a retry needs no second selection. */
  file: File | null;
}

export type AvatarUploadEvent =
  | { type: "selected"; file: File }
  | { type: "cleared" }
  | { type: "retried" }
  | { type: "succeeded"; token: string }
  | { type: "failed" };

export const avatarUploadInitial: AvatarUploadState = {
  status: "idle",
  token: null,
  file: null,
};

/** A failure keeps the file and drops the reference: nothing half-done is ever
 *  carried into the update. */
export const avatarUploadReducer = (
  state: AvatarUploadState,
  event: AvatarUploadEvent,
): AvatarUploadState => {
  switch (event.type) {
    case "selected":
      return { status: "uploading", token: null, file: event.file };
    case "retried":
      return state.file ? { ...state, status: "uploading", token: null } : state;
    case "succeeded":
      return { ...state, status: "uploaded", token: event.token };
    case "failed":
      return { ...state, status: "failed", token: null };
    case "cleared":
      return avatarUploadInitial;
  }
};
