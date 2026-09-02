import { Button, Typography } from "@shared/design-system";
import { SchemaField, toFieldEntries } from "@shared/schema-form";
import { useLoginFlow } from "../../hooks";
import { authFormSchemas } from "../../config/authFormSchemas";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { AuthLink } from "../../navigation";
import styles from "./SignIn.module.css";

const fields = toFieldEntries(authFormSchemas.loginFields);

export const SignIn = () => {
  const {
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useLoginFlow();

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.signIn.title}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.signIn.subtitle}
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
          loadingText={AUTH_COPY.signIn.submitting}
        >
          {AUTH_COPY.signIn.submit}
        </Button>

        <p className={styles.aside}>
          <AuthLink href="/auth/forgot" tone="muted">
            {AUTH_COPY.signIn.forgotPassword}
          </AuthLink>
        </p>
      </form>

      {/* Below the rule is for people who cannot sign in because they have no
          account: make one, or read without one. */}
      <div className={styles.alternatives}>
        <Typography variant="body-small" tone="muted" className={styles.altLabel}>
          {AUTH_COPY.signIn.altLabel}
        </Typography>

        <AuthLink href="/auth/signup">
          {AUTH_COPY.signIn.createAccount}
        </AuthLink>

        <AuthLink href="/feed" tone="muted">
          {AUTH_COPY.signIn.browseAsGuest}
        </AuthLink>
      </div>
    </div>
  );
};
