import type { FieldValue, FormPayload, ValidatorFn } from "../types/schema.types";

export const executeFieldValidators = (
  value: FieldValue,
  formValues: FormPayload,
  validators?: ValidatorFn[] | undefined,
): string | null => {
  if (!validators || validators.length === 0) return null;
  for (const validate of validators) {
    const errorMsg = validate(value, formValues);
    if (errorMsg) return errorMsg;
  }
  return null;
};
