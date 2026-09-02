import { Button, Typography } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { useRegisterFlow } from "../../hooks";
import { authFormSchemas } from "../../config/authFormSchemas";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { AuthLink } from "../../navigation";
import styles from "./SignUp.module.css";

const fields = toFieldEntries(authFormSchemas.registerFields);

export const SignUp = () => {
  const {
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useRegisterFlow();

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.signUp.title}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.signUp.subtitle}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {isError && serverError && (
          <MessageRegion tone="error">{serverError.message}</MessageRegion>
        )}

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
          loadingText={AUTH_COPY.signUp.submitting}
        >
          {AUTH_COPY.signUp.submit}
        </Button>
      </form>

      {/* Below the rule is for people who should not be creating an account:
          they already have one, or they only came to read. */}
      <div className={styles.alternatives}>
        <Typography variant="body-small" tone="muted" className={styles.altLabel}>
          {AUTH_COPY.signUp.altLabel}
        </Typography>

        <AuthLink href="/auth/signin">{AUTH_COPY.signUp.backToLogin}</AuthLink>

        <AuthLink href="/feed" tone="muted">
          {AUTH_COPY.signUp.browseAsGuest}
        </AuthLink>
      </div>
    </div>
  );
};
