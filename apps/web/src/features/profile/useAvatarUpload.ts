import { useCallback, useEffect, useReducer, useRef } from "react";
import { uploadMedia } from "@shared/api";
import { avatarUploadInitial, avatarUploadReducer } from "./services";
import type { AvatarUploadStatus } from "./model";

interface AvatarUpload {
  status: AvatarUploadStatus;
  token: string | null;
  select: (file: File | null) => void;
  retry: () => void;
}

/**
 * The upload runs when the picture is chosen, not when the form is submitted:
 * its four states are states of the screen, and inside a submit they would
 * collapse into one spinner.
 */
export const useAvatarUpload = (upload = uploadMedia): AvatarUpload => {
  const [state, dispatch] = useReducer(avatarUploadReducer, avatarUploadInitial);
  const attempt = useRef(0);

  useEffect(() => {
    if (state.status !== "uploading" || !state.file) return;

    const mine = ++attempt.current;

    upload(state.file)
      .then(({ token }) => {
        if (mine === attempt.current) dispatch({ type: "succeeded", token });
      })
      .catch(() => {
        if (mine === attempt.current) dispatch({ type: "failed" });
      });
  }, [state.status, state.file, upload]);

  const select = useCallback((file: File | null) => {
    dispatch(file ? { type: "selected", file } : { type: "cleared" });
  }, []);

  const retry = useCallback(() => dispatch({ type: "retried" }), []);

  return { status: state.status, token: state.token, select, retry };
};
