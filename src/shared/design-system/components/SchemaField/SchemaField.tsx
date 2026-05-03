import { Input } from "../Input";
import { Checkbox } from "../Checkbox";
import { FileInput } from "../FileInput";
import type { SchemaFieldProps } from "./SchemaField.types";

export const SchemaField = ({
  name,
  type,
  label,
  placeholder,
  value,
  error,
  onChange,
  span = "full",
  autoFocus,
}: SchemaFieldProps) => {
  const isInvalid = !!error;

  const renderField = () => {
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
        return (
          <Input
            name={name}
            type={type}
            label={label}
            placeholder={placeholder}
            value={value as string}
            onChange={onChange}
            isInvalid={isInvalid}
            errorMessage={error ?? undefined}
            autoFocus={autoFocus}
            fullWidth
          />
        );

      case "file":
        return (
          <FileInput
            variant="avatar"
            name={name}
            label={label}
            onNativeChange={onChange}
            isInvalid={isInvalid}
            errorMessage={error ?? undefined}
            fullWidth
          />
        );

      default:
        return null;
    }
  };

  return <div data-span={span} data-type={type}>{renderField()}</div>;
};
