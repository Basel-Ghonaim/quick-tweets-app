import { Button } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { AUTH_COPY } from "../../../config/copy";
import { StepLayout } from "./StepLayout";
import { MessageRegion } from "../../../components/MessageRegion";
import { recoveryFormSchemas } from "../../recoveryFormSchemas";
import { useRecoveryForm } from "../../hooks";

const fields = toFieldEntries(recoveryFormSchemas.passwordFields);

interface RecoveryPasswordProps {
  onSubmit: (newPassword: string) => Promise<void>;
}

export const RecoveryPassword = ({ onSubmit }: RecoveryPasswordProps) => {
  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useRecoveryForm(recoveryFormSchemas.passwordFields, ({ newPassword }) =>
      onSubmit(newPassword),
    );

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
