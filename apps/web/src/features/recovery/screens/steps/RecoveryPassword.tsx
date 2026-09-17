import { Button, MessageRegion } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { AUTH_COPY, CONTROL_COPY } from "@shared/copy";
import { StepLayout } from "./StepLayout";
import { usePasswordForm } from "../../hooks";

interface RecoveryPasswordProps {
  onSubmit: (newPassword: string) => Promise<void>;
}

export const RecoveryPassword = ({ onSubmit }: RecoveryPasswordProps) => {
  const { fields, values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    usePasswordForm(onSubmit);

  return (
    <StepLayout
      title={AUTH_COPY.recovery.passwordTitle}
      subtitle={AUTH_COPY.recovery.passwordSubtitle}
      onSubmit={handleSubmit}
    >
      {serverError && <MessageRegion tone="error">{serverError.message}</MessageRegion>}

      {fields.map((field, index) => (
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
          autoFocus={index === 0}
          controls={CONTROL_COPY}
        />
      ))}

      <Button
        type="submit"
        fullWidth
        isLoading={isSubmitting}
        loadingText={AUTH_COPY.recovery.submittingPassword}
      >
        {AUTH_COPY.recovery.submitPassword}
      </Button>
    </StepLayout>
  );
};
