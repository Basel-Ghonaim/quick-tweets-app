import { useAppSelector } from "@app/store/hooks";
import { useSchemaForm } from "@shared/schema-form";
import type {
  FormFieldConfig,
  FormPayload,
  FormValue,
} from "@shared/schema-form/types/schema.types";
import type { AuthRequestType } from "../store";

type AuthFlowType = Extract<AuthRequestType, "login" | "register">;


export interface AuthFlowReturn<
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
> {
  values: FormValue<TSchema>;
  errors: Record<keyof TSchema, string | null>;
  isSubmitting: boolean;
  handleChange: ReturnType<typeof useSchemaForm<TSchema>>["handleChange"];
  handleSubmit: ReturnType<typeof useSchemaForm<TSchema>>["handleSubmit"];
}

const useAuthFormBase = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
  action: (values: FormValue<TSchema>) => Promise<void>,
  requestType: AuthFlowType,
): AuthFlowReturn<TSchema> => {
  const isServerLoading = useAppSelector(
    (state) => state.auth.requests[requestType].status === "loading",
  );

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
    handleChange: formAPI.handleChange,
    handleSubmit: formAPI.handleSubmit,
  };
};

// ─── Public Consumer Hooks ────────────────────────────────────────────────────
// Phase 3 — implemented in the next step
