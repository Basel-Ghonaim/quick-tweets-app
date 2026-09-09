import { Button, MessageRegion } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { AUTH_COPY } from "../../../config/copy";
import { StepLayout } from "./StepLayout";
import { recoveryFormSchemas } from "../../recoveryFormSchemas";
import { useRecoveryForm } from "../../hooks";

const fields = toFieldEntries(recoveryFormSchemas.requestFields);

interface RecoveryRequestProps {
  /** Shown when a reader arrives here because their reset lapsed. */
  notice?: string;
  initialEmail?: string;
  onSubmit: (email: string) => Promise<void>;
}

export const RecoveryRequest = ({
  notice,
  initialEmail,
  onSubmit,
}: RecoveryRequestProps) => {
  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useRecoveryForm(
      recoveryFormSchemas.requestFields,
      ({ email }) => onSubmit(email),
      initialEmail ? { email: initialEmail } : undefined,
    );

  return (
    <StepLayout
      title={AUTH_COPY.recovery.requestTitle}
      subtitle={AUTH_COPY.recovery.requestSubtitle}
      onSubmit={handleSubmit}
    >
      {serverError && <MessageRegion tone="error">{serverError.message}</MessageRegion>}
      {!serverError && notice && <MessageRegion tone="info">{notice}</MessageRegion>}

      {fields.map((field) => (
        <SchemaField
          key={field.key}
          name={field.key}
          type={field.type}
          label={field.label}
          placeholder={field.placeholder}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={handleChange}
          span={field.span}
          autoFocus
        />
      ))}

      <Button
        type="submit"
        fullWidth
        isLoading={isSubmitting}
        loadingText={AUTH_COPY.recovery.sending}
      >
        {AUTH_COPY.recovery.send}
      </Button>
    </StepLayout>
  );
};
