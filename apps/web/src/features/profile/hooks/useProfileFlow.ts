import { useCallback, useMemo, useState } from "react";
import { toFieldEntries, useSchemaForm } from "@shared/schema-form";
import { useCopy } from "@shared/copy";
import type { SerializedAppError } from "@shared/errors";
import { useRequestState } from "@shared/hooks";
import type { RequestState } from "@shared/types";
import type { AvatarUploadStatus, ProfileSettlement } from "../model";
import { restProfile } from "../gateway";
import { executeProfileUpdate } from "../services";
import { profileFormSchema, BIO_MAX } from "../forms";
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from "../model";
import { useAvatarUpload } from "./useAvatarUpload";
import { composeEdits } from "../services";

type ProfileSchema = ReturnType<typeof profileFormSchema>;

interface ProfileFlow {
  /** What the screen renders, so it names no schema of its own. */
  fields: ReturnType<typeof toFieldEntries<ProfileSchema>>;
  bioMax: number;
  values: { name: string; bio: string };
  errors: Record<"name" | "bio", string | null>;
  isSubmitting: boolean;
  isError: boolean;
  serverError: SerializedAppError | null;
  avatar: {
    status: AvatarUploadStatus;
    select: (file: File | null) => void;
    retry: () => void;
    accept: string;
    maxBytes: number;
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
): ProfileFlow => {
  // Held across renders: the upload effect is keyed on the call it is given.
  const repo = useMemo(() => restProfile(), []);
  const copy = useCopy();
  const schema = useMemo(() => profileFormSchema(copy), [copy]);
  const fields = useMemo(() => toFieldEntries(schema), [schema]);

  const [request, setRequest] = useState<RequestState>({ status: "idle", error: null });
  const { isLoading, isError, error: serverError } = useRequestState(request);
  const avatar = useAvatarUpload(repo.uploadAvatar);

  const submit = useCallback(
    async (values: { name: string; bio: string }) => {
      const edits = composeEdits(values, avatar.token);

      await executeProfileUpdate(setRequest, () => repo.updateProfile(edits), copy.auth.profile);
      onSettled?.("saved");
    },
    [avatar.token, copy, onSettled, repo],
  );

  const form = useSchemaForm(schema, submit, () => {});

  /** Skipping is the absence of a request, and the outcome is what says so. */
  const skip = useCallback(() => onSettled?.("skipped"), [onSettled]);

  return {
    fields,
    bioMax: BIO_MAX,
    values: form.values,
    errors: form.errors,
    isSubmitting: form.isSubmitting || isLoading,
    isError,
    serverError,
    avatar: {
      status: avatar.status,
      select: avatar.select,
      retry: avatar.retry,
      accept: AVATAR_ACCEPT,
      maxBytes: AVATAR_MAX_BYTES,
    },
    handleChange: form.handleChange,
    handleSubmit: form.handleSubmit,
    skip,
  };
};
