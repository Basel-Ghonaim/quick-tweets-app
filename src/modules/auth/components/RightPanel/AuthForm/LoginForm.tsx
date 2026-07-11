import { useLoginFlow } from "../../../hooks";
import { authFormSchemas } from "../../../config/authFormSchemas";
import { toFieldEntries, SchemaField } from "@shared/schema-form";
import { Button } from "@shared/design-system";
import { OAuthButtons } from "../OAuthButtons/OAuthButtons";
import styles from "./AuthForm.module.css";

export const LoginForm = () => {
  const {
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useLoginFlow();

  const fields = toFieldEntries(authFormSchemas.loginFields);


  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isError && serverError && (
        <div className={styles.serverError} role="alert">
          {serverError.message}
        </div>
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
        state={isSubmitting ? "loading" : "idle"}
        loadingText="Signing in…"
        className={styles.submit}
      >
        Sign in
      </Button>

      <OAuthButtons />
    </form>
  );
};
