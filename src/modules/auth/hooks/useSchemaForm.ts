import { useState, useCallback, type ChangeEvent } from "react";
import type {
  FormFieldConfig,
  FormState,
  FormPayload,
} from "../types/schema.types";
import { buildInitialFormState } from "../services";

export const useSchemaForm = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
  // onSubmitAction: (values: FormValue<TSchema>) => Promise<void>,
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

        let fieldError: string | null = null;
        const validators = schema[fieldName].validators;
        if (validators && validators.length > 0) {
          for (const validate of validators) {
            const errorMsg = validate(fieldValue, nextValues as FormPayload);
            if (errorMsg) {
              fieldError = errorMsg;
              break;
            }
          }
        }

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

  return {
    ...state,
    handleChange,
  };
};
