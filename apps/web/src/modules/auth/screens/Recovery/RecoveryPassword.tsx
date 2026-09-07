import { Button, Typography } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { recoveryFormSchemas, useRecoveryForm, type RecoveryPosition } from "../../recovery";
import styles from "./Recovery.module.css";

const fields = toFieldEntries(recoveryFormSchemas.passwordFields);

interface RecoveryPasswordProps {
  position: RecoveryPosition;
  onSubmit: (newPassword: string) => Promise<void>;
}

export const RecoveryPassword = ({ position, onSubmit }: RecoveryPasswordProps) => {
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

      {/* The address is shown so a reader knows whose password this changes,
          masked at the source and never echoed from what they typed. */}
      <Typography variant="body-small" tone="muted" className={styles.aside}>
        {position.maskedEndpoint}
      </Typography>
    </div>
  );
};
