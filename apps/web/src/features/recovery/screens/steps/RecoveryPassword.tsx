import { Button, MessageRegion } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { useCopy } from "@shared/copy";
import { StepLayout } from "./StepLayout";
import { usePasswordForm } from "../../hooks";

interface RecoveryPasswordProps {
  onSubmit: (newPassword: string) => Promise<void>;
}

export const RecoveryPassword = ({ onSubmit }: RecoveryPasswordProps) => {
  const copy = useCopy();
  const { fields, values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    usePasswordForm(onSubmit);

  return (
    <StepLayout
      title={copy.auth.recovery.passwordTitle}
      subtitle={copy.auth.recovery.passwordSubtitle}
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
          dir={field.dir}
          autoFocus={index === 0}
          controls={copy.controls}
        />
      ))}

      <Button
        type="submit"
        fullWidth
        isLoading={isSubmitting}
        loadingText={copy.auth.recovery.submittingPassword}
      >
        {copy.auth.recovery.submitPassword}
      </Button>
    </StepLayout>
  );
};
