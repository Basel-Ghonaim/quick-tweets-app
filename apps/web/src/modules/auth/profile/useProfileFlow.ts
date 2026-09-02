import { useCallback } from "react";
import { useSchemaForm } from "@shared/schema-form";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import { useAuthDispatch, useAuthSelector } from "../store/hooks";
import { restProfile } from "./restProfile";
import { executeProfileUpdate } from "./executeProfileUpdate";
import { profileFormSchema } from "./profileFormSchema";
import { useAvatarUpload } from "./useAvatarUpload";
import { composeEdits } from "./composeEdits";
import type { AvatarUploadStatus } from "./avatarUpload";

interface ProfileFlow {
  values: { name: string; bio: string };
  errors: Record<"name" | "bio", string | null>;
  isSubmitting: boolean;
  isError: boolean;
  serverError: SerializedAppError | null;
  avatar: {
    status: AvatarUploadStatus;
    select: (file: File | null) => void;
    retry: () => void;
  };
  handleChange: ReturnType<typeof useSchemaForm>["handleChange"];
  handleSubmit: ReturnType<typeof useSchemaForm>["handleSubmit"];
  skip: () => void;
}

/**
 * Composes the two requests behind one submit: the picture is already uploaded
 * by the time Save runs, so the update carries its reference rather than bytes.
 */
export const useProfileFlow = (onDone?: () => void, repo = restProfile()): ProfileFlow => {
  const dispatch = useAuthDispatch();
  const requestState = useAuthSelector((state) => state.auth.requests.updateProfile);
  const { isLoading, isError, error: serverError } = useRequestState(requestState);
  const avatar = useAvatarUpload();

  const submit = useCallback(
    async (values: { name: string; bio: string }) => {
      const edits = composeEdits(values, avatar.token);

      await executeProfileUpdate(dispatch, () => repo.updateProfile(edits));
      onDone?.();
    },
    [avatar.token, dispatch, onDone, repo],
  );

  const form = useSchemaForm(profileFormSchema, submit, () => {});

  /** Skipping is the absence of a request: the endpoint refuses a body with no
   *  field, and there is no draft profile to clear. */
  const skip = useCallback(() => onDone?.(), [onDone]);

  return {
    values: form.values,
    errors: form.errors,
    isSubmitting: form.isSubmitting || isLoading,
    isError,
    serverError,
    avatar: { status: avatar.status, select: avatar.select, retry: avatar.retry },
    handleChange: form.handleChange,
    handleSubmit: form.handleSubmit,
    skip,
  };
};
