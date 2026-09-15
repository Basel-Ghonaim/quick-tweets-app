import { http, HttpResponse } from "msw";
import { api } from "../api";

const ME = api("/users/me");
const MEDIA = api("/media");

/** What the screen reads back from an update. The full self profile is the
 *  User domain's, and the capability asks for none of it. */
export const profileSaves = (
  over: { username?: string; name?: string | null; bio?: string } = {},
) =>
  http.patch(ME, () =>
    HttpResponse.json({
      success: true,
      data: { username: "reader", name: null, bio: "", ...over },
    }),
  );

/** A refusal the screen turns into its own wording. `422` is what the contract
 *  gives a rejected field, and the normalizer reads it as `validation`. */
export const profileRefuses = (status = 422) =>
  http.patch(ME, () =>
    HttpResponse.json(
      { success: false, error: { type: "validation", message: "raw" } },
      { status },
    ),
  );

/** A save left in flight, so the submitting state stays on screen. */
export const profileNeverSaves = () =>
  http.patch(ME, () => new Promise<never>(() => {}));

export const avatarUploads = (token = "a-token") =>
  http.post(MEDIA, () =>
    HttpResponse.json({
      success: true,
      data: { token, contentType: "image/png", size: 3 },
    }),
  );

export const avatarRefused = (status = 422) =>
  http.post(MEDIA, () =>
    HttpResponse.json(
      { success: false, error: { type: "validation", message: "raw" } },
      { status },
    ),
  );

/** An upload left in flight, so the uploading state stays on screen. */
export const avatarNeverUploads = () =>
  http.post(MEDIA, () => new Promise<never>(() => {}));
