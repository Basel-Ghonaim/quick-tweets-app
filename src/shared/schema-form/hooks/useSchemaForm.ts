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
import { useLatest } from "../../hooks/useLatest";

export const useSchemaForm = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
  onSubmitAction: (values: FormValue<TSchema>) => Promise<void>,
) => {
  const [state, setState] = useState<FormState<TSchema>>(() =>
    buildInitialFormState(schema),
  );
  const latestValues = useLatest(state.values);

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

      const currentValues = latestValues.current;
      const { isValid, errors } = validateSchemaForm(schema, currentValues);

      if (!isValid) {
        setState((prev) => ({ ...prev, errors }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: true,
      }));

      try {
        await onSubmitAction(currentValues);
      } catch {
        // We catch here silently because Redux authErrorHandler already handles toast popups
      } finally {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    },
    [schema, onSubmitAction, latestValues],
  );

  return {
    ...state,
    handleChange,
    handleSubmit,
  };
};
