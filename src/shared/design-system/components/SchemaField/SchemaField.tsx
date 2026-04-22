import { Input } from "../Input";
import { Checkbox } from "../Checkbox";
import type { SchemaFieldProps } from "./SchemaField.types";

export const SchemaField = ({
  name,
  type,
  label,
  placeholder,
  value,
  error,
  onChange,
}: SchemaFieldProps) => {
  const isInvalid = !!error;

  switch (type) {
    case "checkbox":
      return (
        <Checkbox
          name={name}
          label={label}
          checked={value as boolean}
          onChange={onChange}
          isInvalid={isInvalid}
          errorMessage={error ?? undefined}
        />
      );

    case "text":
    case "email":
    case "password":
    case "number":
    case "file":
      return (
        <Input
          name={name}
          type={type}
          label={label}
          placeholder={placeholder}
          value={type === "file" ? undefined : (value as string)}
          onChange={onChange}
          isInvalid={isInvalid}
          errorMessage={error ?? undefined}
          fullWidth
        />
      );

    default:
      return null;
  }
};
