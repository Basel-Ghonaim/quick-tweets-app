import { useMemo } from "react";
import { useAuthenticationSelector } from "../store";
import { useRequestState } from "@shared/hooks";
import type { SerializedAppError } from "@shared/errors";
import {
  toFieldEntries,
  useSchemaForm,
  type FormFieldConfig,
  type FormPayload,
  type FormValue,
  type FormChangeHandler,
  type FormSubmitHandler,
} from "@shared/schema-form";
import { useCopy } from "@shared/copy";
import { useAuthActions } from "./useAuthActions";
import { authFormSchemas } from "../forms";
import { afterSuccess } from "../services";

import type { AuthRequestType } from "../store";

type AuthFlowType = AuthRequestType;

/** The schemas in the active language, held until the language changes. */
const useAuthFormSchemas = () => {
  const copy = useCopy();
  return useMemo(() => authFormSchemas(copy), [copy]);
};

export interface AuthFlowReturn<
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
> {
  values: FormValue<TSchema>;
  errors: Record<keyof TSchema, string | null>;
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  serverError: SerializedAppError | null;
  handleChange: FormChangeHandler;
  handleSubmit: FormSubmitHandler;
}

const useAuthFormBase = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
  action: (values: FormValue<TSchema>) => Promise<void>,
  requestType: AuthFlowType,
): AuthFlowReturn<TSchema> => {
  const requestState = useAuthenticationSelector(
    (state) => state.authentication[requestType],
  );
  const {
    isLoading: isServerLoading,
    isSuccess,
    isError,
    error: serverError,
  } = useRequestState(requestState);

  const formAPI = useSchemaForm(schema, action, (err) => {
    // TODO: [Toast Epic] toast.error(formatAuthError(err))
    // Error is already stored in Redux via authRequestRejected.
    // This is the side-effect entry point for user-facing notifications.
    console.error(`[useAuthFlow:${requestType}] Submit failed:`, err);
  });

  return {
    values: formAPI.values,
    errors: formAPI.errors,
    isSubmitting: formAPI.isSubmitting || isServerLoading,
    isSuccess,
    isError,
    serverError,
    handleChange: formAPI.handleChange,
    handleSubmit: formAPI.handleSubmit,
  };
};

// ─── Public Consumer Hooks ────────────────────────────────────────────────────

export const useLoginFlow = (onDone?: () => void) => {
  const { login } = useAuthActions();
  const { loginFields } = useAuthFormSchemas();
  const fields = useMemo(() => toFieldEntries(loginFields), [loginFields]);
  const form = useAuthFormBase(loginFields, afterSuccess(login, onDone), "login");

  return { fields, ...form };
};

export const useRegisterFlow = (onDone?: () => void) => {
  const { register } = useAuthActions();
  const { registerFields } = useAuthFormSchemas();
  const fields = useMemo(() => toFieldEntries(registerFields), [registerFields]);
  const form = useAuthFormBase(registerFields, afterSuccess(register, onDone), "register");

  return { fields, ...form };
};
