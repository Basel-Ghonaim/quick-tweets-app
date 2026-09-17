import { useLocation } from "react-router-dom";
import { Button, MessageRegion, Typography } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { useLoginFlow } from "../../hooks";
import { useCopy } from "@shared/copy";
import { RouteLink, useRouteNavigate } from "@shared/routing";
import styles from "./SignIn.module.css";

export const SignIn = () => {
  const copy = useCopy();
  const navigate = useRouteNavigate();
  const { notice } = (useLocation().state ?? {}) as { notice?: string };

  const {
    fields,
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useLoginFlow(() => navigate("/feed"));

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {copy.auth.signIn.title}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {copy.auth.signIn.subtitle}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {isError && serverError && (
          <MessageRegion tone="error">{serverError.message}</MessageRegion>
        )}
        {!isError && notice && <MessageRegion tone="info">{notice}</MessageRegion>}

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
          loadingText={copy.auth.signIn.submitting}
        >
          {copy.auth.signIn.submit}
        </Button>

        <p className={styles.aside}>
          <RouteLink href="/auth/recovery" tone="muted">
            {copy.auth.signIn.forgotPassword}
          </RouteLink>
        </p>
      </form>

      {/* Below the rule is for people who cannot sign in because they have no
          account: make one, or read without one. */}
      <div className={styles.alternatives}>
        <Typography variant="body-small" tone="muted" className={styles.altLabel}>
          {copy.auth.signIn.altLabel}
        </Typography>

        <RouteLink href="/auth/signup">
          {copy.auth.signIn.createAccount}
        </RouteLink>

        <RouteLink href="/feed" tone="muted">
          {copy.auth.signIn.browseAsGuest}
        </RouteLink>
      </div>
    </div>
  );
};
