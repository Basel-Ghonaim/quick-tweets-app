import { forwardRef, useId, useRef, useState } from "react";
import styles from "./FileInput.module.css";
import type { FileInputProps } from "./FileInput.types";
import { StandardInput, DropzoneInput, AvatarInput } from "./variants";

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      name,
      label,
      variant = "standard",
      avatarShape = "circle",
      avatarFill = "default",
      avatarBorder = "dashed",
      avatarSize = 120,
      color = "primary",
      accept,
      maxSize,
      multiple = false,
      maxFiles,
      minFiles,
      isInvalid = false,
      errorMessage,
      helperText,
      disabled = false,
      fullWidth = false,
      className = "",
      children,
      onChange,
      onNativeChange,
    },
    ref,
  ) => {
    const generatedId = useId();
    const errorId = `${generatedId}-error`;
    const helperId = `${generatedId}-helper`;
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? internalRef;
    const [validationError, setValidationError] = useState("");

    const hasError = isInvalid || !!validationError;

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : "",
      variant === "avatar" ? styles.avatarContainer : "",
      hasError ? styles.isInvalid : "",
      disabled ? styles.isDisabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const renderVariant = () => {
      switch (variant) {
        case "standard":
          return (
            <StandardInput
              inputRef={inputRef}
              generatedId={generatedId}
              errorId={errorId}
              helperId={helperId}
              name={name}
              accept={accept}
              maxSize={maxSize}
              multiple={multiple}
              maxFiles={maxFiles}
              minFiles={minFiles}
              disabled={disabled}
              isInvalid={isInvalid}
              errorMessage={errorMessage}
              helperText={helperText}
              color={color}
              avatarShape={avatarShape}
              avatarFill={avatarFill}
              avatarBorder={avatarBorder}
              avatarSize={avatarSize}
              children={children}
              onChange={onChange}
              onNativeChange={onNativeChange}
              onValidationError={setValidationError}
            />
          );

        case "dropzone":
          return (
            <DropzoneInput
              inputRef={inputRef}
              generatedId={generatedId}
              errorId={errorId}
              helperId={helperId}
              name={name}
              accept={accept}
              maxSize={maxSize}
              multiple={multiple}
              maxFiles={maxFiles}
              minFiles={minFiles}
              disabled={disabled}
              isInvalid={isInvalid}
              errorMessage={errorMessage}
              helperText={helperText}
              color={color}
              avatarShape={avatarShape}
              avatarFill={avatarFill}
              avatarBorder={avatarBorder}
              avatarSize={avatarSize}
              onChange={onChange}
              onNativeChange={onNativeChange}
              onValidationError={setValidationError}
            />
          );

        case "avatar":
          return (
            <AvatarInput
              inputRef={inputRef}
              generatedId={generatedId}
              errorId={errorId}
              helperId={helperId}
              name={name}
              accept={accept}
              maxSize={maxSize}
              multiple={false}
              disabled={disabled}
              isInvalid={isInvalid}
              errorMessage={errorMessage}
              helperText={helperText}
              color={color}
              avatarShape={avatarShape}
              avatarFill={avatarFill}
              avatarBorder={avatarBorder}
              avatarSize={avatarSize}
              onChange={onChange}
              onNativeChange={onNativeChange}
              onValidationError={setValidationError}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={generatedId} className={styles.label}>
            {label}
          </label>
        )}

        {renderVariant()}

        {helperText && !isInvalid && !validationError && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}

        {validationError && (
          <span className={styles.errorMessage} role="alert">
            {validationError}
          </span>
        )}

        {isInvalid && errorMessage && !validationError && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);

FileInput.displayName = "FileInput";
