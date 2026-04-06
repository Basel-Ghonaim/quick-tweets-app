import { useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import type {
  FormFieldConfig,
  FormState,
  FormPayload,
  FormValue,
} from "../types/schema.types";
import {
  buildInitialFormState,
  executeFieldValidators,
  validateSchemaForm,
} from "../services";

export const useSchemaForm = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
  onSubmitAction: (values: FormValue<TSchema>) => Promise<void>,
) => {
  const [state, setState] = useState<FormState<TSchema>>(() =>
    buildInitialFormState(schema),
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked, files } = e.target;
      const fieldName = name as Extract<keyof TSchema, string>;

      if (!schema[fieldName]) return;

      const fieldValue =
        type === "checkbox"
          ? checked
          : type === "file"
            ? files
              ? files[0]
              : null
            : value;

      setState((prev) => {
        const nextValues = {
          ...prev.values,
          [fieldName]: fieldValue,
        };

        const validators = schema[fieldName].validators;
        const fieldError = executeFieldValidators(
          fieldValue,
          nextValues as FormPayload,
          validators,
        );

        return {
          ...prev,
          values: nextValues,
          errors: {
            ...prev.errors,
            [fieldName]: fieldError,
          },
        };
      });
    },
    [schema],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { isValid, errors } = validateSchemaForm(schema, state.values);
      if (!isValid) {
        setState((prev) => ({ ...prev, errors }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: true,
      }));

      try {
        await onSubmitAction(state.values);
      } catch {
        // We catch here silently because Redux authErrorHandler already handles toast popups
      } finally {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    },
    [schema, onSubmitAction, state.values],
  );

  return {
    ...state,
    handleChange,
    handleSubmit,
  };
};
