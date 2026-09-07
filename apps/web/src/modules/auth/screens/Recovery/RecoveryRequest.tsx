import { Button, Typography } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { AuthLink } from "../../navigation";
import { recoveryFormSchemas, useRecoveryForm } from "../../recovery";
import styles from "./Recovery.module.css";

const fields = toFieldEntries(recoveryFormSchemas.requestFields);

interface RecoveryRequestProps {
  /** Shown when a reader arrives here because their reset lapsed. */
  notice?: string;
  onSubmit: (email: string) => Promise<void>;
}

export const RecoveryRequest = ({ notice, onSubmit }: RecoveryRequestProps) => {
  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useRecoveryForm(recoveryFormSchemas.requestFields, ({ email }) => onSubmit(email));

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.recovery.requestTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.recovery.requestSubtitle}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
      </form>

      <p className={styles.aside}>
        <AuthLink href="/auth/signin" tone="muted">
          {AUTH_COPY.recovery.backToLogin}
        </AuthLink>
      </p>
    </div>
  );
};
