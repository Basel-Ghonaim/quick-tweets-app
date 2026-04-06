import { useState } from "react";
import type {
  FormFieldConfig,
  FieldValue,
  FormState,
  FormValue,
} from "../types/schema.types";
import { buildInitialFormState } from "../services";

export const useSchemaForm = <
  TSchema extends Record<string, FormFieldConfig<Record<string, FieldValue>>>,
>(
  schema: TSchema,
  onSubmitAction: (values: FormValue<TSchema>) => Promise<void>,
) => {
  const [state, setState] = useState<FormState<TSchema>>(() =>
    buildInitialFormState(schema),
  );
  return {
    ...state,
  };
};
