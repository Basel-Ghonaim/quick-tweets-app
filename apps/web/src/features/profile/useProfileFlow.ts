import { useCallback, useState } from "react";
import { useSchemaForm } from "@shared/schema-form";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import type { RequestState } from "@shared/types";
import type { ProfileSettlement } from "./model";
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
export const useProfileFlow = (
  onSettled?: (outcome: ProfileSettlement) => void,
  repo = restProfile(),
): ProfileFlow => {
  const [request, setRequest] = useState<RequestState>({ status: "idle", error: null });
  const { isLoading, isError, error: serverError } = useRequestState(request);
  const avatar = useAvatarUpload();

  const submit = useCallback(
    async (values: { name: string; bio: string }) => {
      const edits = composeEdits(values, avatar.token);

      await executeProfileUpdate(setRequest, () => repo.updateProfile(edits));
      onSettled?.("saved");
    },
    [avatar.token, onSettled, repo],
  );

  const form = useSchemaForm(profileFormSchema, submit, () => {});

  /** Skipping is the absence of a request, and the outcome is what says so. */
  const skip = useCallback(() => onSettled?.("skipped"), [onSettled]);

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
