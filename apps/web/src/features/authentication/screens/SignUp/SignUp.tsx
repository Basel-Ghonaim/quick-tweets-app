import { Button, MessageRegion, Typography } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { useRegisterFlow } from "../../hooks";
import { useCopy } from "@shared/copy";
import { RouteLink, useRouteNavigate } from "@shared/routing";
import styles from "./SignUp.module.css";

export const SignUp = () => {
  const copy = useCopy();
  const navigate = useRouteNavigate();

  const {
    fields,
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useRegisterFlow(() => navigate("/auth/onboarding"));

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {copy.auth.signUp.title}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {copy.auth.signUp.subtitle}
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
            controls={copy.controls}
          />
        ))}

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText={copy.auth.signUp.submitting}
        >
          {copy.auth.signUp.submit}
        </Button>
      </form>

      {/* Below the rule is for people who should not be creating an account:
          they already have one, or they only came to read. */}
      <div className={styles.alternatives}>
        <Typography variant="body-small" tone="muted" className={styles.altLabel}>
          {copy.auth.signUp.altLabel}
        </Typography>

        <RouteLink href="/auth/signin">{copy.auth.signUp.backToLogin}</RouteLink>

        <RouteLink href="/feed" tone="muted">
          {copy.auth.signUp.browseAsGuest}
        </RouteLink>
      </div>
    </div>
  );
};
