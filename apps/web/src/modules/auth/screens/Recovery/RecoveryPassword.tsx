import { Button, Typography } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { AuthLink } from "../../navigation";
import { recoveryFormSchemas, useRecoveryForm } from "../../recovery";
import styles from "./Recovery.module.css";

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
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.recovery.passwordTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.recovery.passwordSubtitle}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
      </form>

      <p className={styles.aside}>
        <AuthLink href="/auth/signin" tone="muted">
          {AUTH_COPY.recovery.backToLogin}
        </AuthLink>
      </p>
    </div>
  );
};
