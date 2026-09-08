import type { FormEventHandler, ReactNode } from "react";
import { Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../../config/copy";
import { AuthLink } from "../../../navigation";
import styles from "./StepLayout.module.css";

interface StepLayoutProps {
  title: string;
  subtitle: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

export const StepLayout = ({ title, subtitle, onSubmit, children }: StepLayoutProps) => (
  <div className={styles.root}>
    <Typography variant="heading-large" as="h1">
      {title}
    </Typography>
    <Typography variant="body-medium" tone="secondary">
      {subtitle}
    </Typography>

    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {children}
    </form>

    <p className={styles.aside}>
      <AuthLink href="/auth/signin" tone="muted">
        {AUTH_COPY.recovery.backToLogin}
      </AuthLink>
    </p>
  </div>
);
