import { Input, Checkbox, FileInput } from "@shared/design-system";
import type { SchemaFieldProps } from "./SchemaField.types";

// Compile-time exhaustiveness guard: if a new FieldType is added to the public
// union without a branch below, `type` is no longer `never` here and this fails
// to type-check — forcing the seam to be updated (with a loud runtime backstop).
const assertNever = (fieldType: never): never => {
  throw new Error(`SchemaField: unhandled field type "${String(fieldType)}".`);
};

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
            onChange={onChange}
            isInvalid={isInvalid}
            errorMessage={error ?? undefined}
            fullWidth
          />
        );

      case "file-multiple":
        return (
          <FileInput
            variant="standard"
            multiple
            name={name}
            label={label}
            onChange={onChange}
            isInvalid={isInvalid}
            errorMessage={error ?? undefined}
            fullWidth
          />
        );

      // Declared in the public FieldType union but not yet renderable: no
      // design-system control exists (and radio/select also need an options
      // contract). Fail fast rather than silently render nothing, so misuse
      // surfaces immediately in development. A future architectural review is
      // tracked in Finding 0005.
      case "radio":
      case "select":
      case "textarea":
        throw new Error(
          `SchemaField: field type "${type}" is part of the schema-form public ` +
            `API but is not implemented yet — see Finding 0005. Do not use it in ` +
            `a schema until a design-system control exists.`,
        );

      default:
        return assertNever(type);
    }
  };

  return <div data-span={span} data-type={type}>{renderField()}</div>;
};
