import { useAuthenticationSelector } from "../store/hooks";
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
import { useAuthActions } from "./useAuthActions";
import { authFormSchemas } from "../forms";
import { afterSuccess } from "../services";

import type { AuthRequestType } from "../store";

type AuthFlowType = AuthRequestType;

const loginFields = toFieldEntries(authFormSchemas.loginFields);
const registerFields = toFieldEntries(authFormSchemas.registerFields);

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
  const form = useAuthFormBase(
    authFormSchemas.loginFields,
    afterSuccess(login, onDone),
    "login",
  );

  return { fields: loginFields, ...form };
};

export const useRegisterFlow = (onDone?: () => void) => {
  const { register } = useAuthActions();
  const form = useAuthFormBase(
    authFormSchemas.registerFields,
    afterSuccess(register, onDone),
    "register",
  );

  return { fields: registerFields, ...form };
};
