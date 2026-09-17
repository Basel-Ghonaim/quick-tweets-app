import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import styles from "./FileInput.module.css";
import type { FileInputProps } from "./FileInput.types";
import type { VariantContext } from "./variants/variant.types";
import { StandardInput, DropzoneInput, AvatarInput } from "./variants";
import { classNames, customProperties, useFieldA11y } from "../../shared";
import { FieldLabel, FieldMessages } from "../anatomy";

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (props, ref) => {
    const {
      name,
      label,
      color = "primary",
      accept,
      maxSize,
      isInvalid = false,
      errorMessage,
      helperText,
      disabled = false,
      fullWidth = false,
      className,
      id,
      onChange,
      onFilesChange,
    } = props;

    // The shell owns the element and the variants need a real object ref to
    // open the picker, so the forwarded ref is *published* rather than passed
    // through. The previous cast to RefObject silently mishandled a callback
    // ref, which is the other half of what forwardRef may hand you.
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    const [validationError, setValidationError] = useState("");

    // A constraint the variant enforced outranks one the caller declared, and
    // whichever is shown is the one the control is described by — the internal
    // error previously rendered with no id, so nothing pointed at it.
    const effectiveError = validationError || errorMessage;
    const hasError = isInvalid || Boolean(validationError);

    const { controlId, errorId, helperId, showError, describedBy } = useFieldA11y({
      id,
      isInvalid: hasError,
      errorMessage: effectiveError,
      helperText,
    });

    // Injected by the shell rather than per variant: all three render the role,
    // and only the avatar used to set it — so `color` did nothing on the others.
    const roleColour = customProperties({
      "--file-input-color": `var(--role-fill-${color})`,
      "--file-input-alpha": `var(--role-fill-${color}-subtle)`,
    });

    const context: VariantContext = {
      inputRef,
      controlId,
      describedBy,
      name,
      accept,
      maxSize,
      disabled,
      isInvalid: hasError,
      onChange,
      onFilesChange,
      onValidationError: setValidationError,
    };

    const renderVariant = () => {
      switch (props.variant) {
        case "dropzone":
          return (
            <DropzoneInput
              context={context}
              content={props.content}
              multiple={props.multiple ?? false}
              maxFiles={props.maxFiles}
              minFiles={props.minFiles}
            />
          );

        case "avatar":
          return (
            <AvatarInput
              context={context}
              content={props.content}
              avatarShape={props.avatarShape ?? "circle"}
              avatarFill={props.avatarFill ?? "default"}
              avatarBorder={props.avatarBorder ?? "dashed"}
              avatarSize={props.avatarSize ?? 120}
            />
          );

        default:
          return (
            <StandardInput
              context={context}
              content={props.content}
              multiple={props.multiple ?? false}
              trigger={props.children}
            />
          );
      }
    };

    return (
      <div
        className={classNames(
          styles.root,
          fullWidth && styles.fullWidth,
          props.variant === "avatar" && styles.avatarContainer,
          hasError && styles.isInvalid,
          disabled && styles.isDisabled,
          className,
        )}
        style={roleColour}
      >
        <FieldLabel htmlFor={controlId}>{label}</FieldLabel>

        {renderVariant()}

        {/* This field drops its description while an error stands, which the
            others do not. The policy stays here rather than becoming a branch
            in the shared part for one consumer. */}
        <FieldMessages
          helperId={helperId}
          errorId={errorId}
          helperText={showError ? undefined : helperText}
          errorMessage={effectiveError}
          showError={showError}
        />
      </div>
    );
  },
);

FileInput.displayName = "FileInput";
