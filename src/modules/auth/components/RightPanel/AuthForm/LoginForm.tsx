import { OAuthButtons } from "../OAuthButtons/OAuthButtons";
import { PasswordField } from "../PasswordField/PasswordField";
import styles from "./AuthForm.module.css";

export const LoginForm = () => {
  return (
    <form className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Work email</label>
        <input
          className={styles.input}
          type="email"
          placeholder="you@company.com"
        />
      </div>

      <PasswordField
        label="Password"
        placeholder="Min. 8 characters"
        showForgot={true}
      />

      <button type="submit" className={styles.submit}>
        Sign in
      </button>

      <OAuthButtons />
    </form>
  );
};
