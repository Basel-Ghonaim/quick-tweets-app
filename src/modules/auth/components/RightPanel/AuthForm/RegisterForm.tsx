import { useRegisterFlow } from "../../../hooks";
import { authFormSchemas } from "../../../config/authFormSchemas";
import { toFieldEntries } from "@shared/schema-form";
import { SchemaField, Button } from "@shared/design-system";
import { OAuthButtons } from "../OAuthButtons/OAuthButtons";
import styles from "./AuthForm.module.css";

export const RegisterForm = () => {
  const {
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    handleChange,
    handleSubmit,
  } = useRegisterFlow();

  const fields = toFieldEntries(authFormSchemas.registerFields);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isError && serverError && (
        <div className={styles.serverError} role="alert">
          {serverError.message}
        </div>
      )}

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
        />
      ))}

      <Button
        type="submit"
        fullWidth
        state={isSubmitting ? "loading" : "idle"}
        loadingText="Creating account…"
        className={styles.submit}
      >
        Create account
      </Button>

      <OAuthButtons />
    </form>
  );
};
