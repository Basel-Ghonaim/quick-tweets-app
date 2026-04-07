import { useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import type {
  FormFieldConfig,
  FormState,
  FormPayload,
  FormValue,
  FieldValue,
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
  onError?: (err: unknown) => void,
) => {
  const [state, setState] = useState<FormState<TSchema>>(() =>
    buildInitialFormState(schema),
  );
  const latestValues = useLatest(state.values);
  const latestOnSubmit = useLatest(onSubmitAction);

  const handleChange = useCallback(
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;
      const el = e.target;
      const fieldName = name as Extract<keyof TSchema, string>;

      if (!schema[fieldName]) return;

      const schemaType = schema[fieldName].type;

      let fieldValue = value as FieldValue;
      if (el instanceof HTMLInputElement) {
        switch (schemaType) {
          case "checkbox":
            fieldValue = el.checked;
            break;
          case "file":
            if (el.files && el.files.length > 0) {
              fieldValue = el.multiple ? Array.from(el.files) : el.files[0];
            } else {
              fieldValue = null;
            }
            break;
          case "number":
            fieldValue = el.value === "" ? "" : Number(el.value);
            break;
        }
      }

      // Update errors and values in real time
      setState((prev) => {
        const nextValues = {
          ...prev.values,
          [fieldName]: fieldValue,
        };

        const validators = schema[fieldName].validators;
        const fieldError = executeFieldValidators(
          fieldValue,
          nextValues,
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
        await latestOnSubmit.current(currentValues);
      } catch (err) {
        if (onError) {
          onError(err);
        } else {
          console.error("[useSchemaForm] Submit failed:", err);
        }
      } finally {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    },
    [schema, latestOnSubmit, onError, latestValues],
  );

  return {
    ...state,
    handleChange,
    handleSubmit,
  };
};
