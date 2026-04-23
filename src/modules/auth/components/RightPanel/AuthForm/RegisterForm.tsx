import { OAuthButtons } from "../OAuthButtons/OAuthButtons";
import styles from "./AuthForm.module.css";

export const RegisterForm = () => {
  return (
    <form className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Full name</label>
        <input className={styles.input} type="text" placeholder="Jane Smith" />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Work email</label>
        <input
          className={styles.input}
          type="email"
          placeholder="you@company.com"
        />
      </div>

      <div className={styles.terms}>
        <input type="checkbox" id="terms" className={styles.checkbox} />
        <label htmlFor="terms" className={styles.termsLabel}>
          I agree to the{" "}
          <a href="#" className={styles.termsLink}>
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className={styles.termsLink}>
            Privacy Policy
          </a>
        </label>
      </div>

      <button type="submit" className={styles.submit}>
        Create account
      </button>

      <OAuthButtons />
    </form>
  );
};
