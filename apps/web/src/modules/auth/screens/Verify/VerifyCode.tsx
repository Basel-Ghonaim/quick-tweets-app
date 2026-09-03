import { Button, Input, Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { useCodeFlow } from "../../verification";
import { AuthLink, useAuthNavigate } from "../../navigation";
import { useLocation } from "react-router-dom";
import styles from "./Verify.module.css";

export const VerifyCode = () => {
  const navigate = useAuthNavigate();

  /* Handed over by the ask, which was told the window and is leaving. A reload
     loses it, and the first resend asks the server for it again. */
  const { state } = useLocation();
  const openingWindow = (state as { resendAvailableInSeconds?: number } | null)
    ?.resendAvailableInSeconds;
  const {
    code,
    setCode,
    isSubmitting,
    isResending,
    error,
    secondsLeft,
    canResend,
    announcement,
    resend,
    submit,
  } = useCodeFlow(
    () => navigate("/feed"),
    undefined,
    AUTH_COPY.verify.resendReady,
    openingWindow,
  );

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.verify.codeTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.verify.codeSubtitle}
      </Typography>

      {error && <MessageRegion tone="error">{error.message}</MessageRegion>}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Input
          name="code"
          label={AUTH_COPY.verify.codeLabel}
          helperText={AUTH_COPY.verify.codeHint}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          fullWidth
          autoFocus
        />

        <p className={styles.resend}>
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={!canResend || isResending}
            onClick={resend}
          >
            {canResend ? AUTH_COPY.verify.resend : AUTH_COPY.verify.resendIn(secondsLeft)}
          </Button>
        </p>

        {/* The seconds tick, so they are not spoken; only the moment that
            changes what the reader can do is. */}
        <p className={styles.announce} role="status">
          {announcement}
        </p>

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText={AUTH_COPY.verify.submitting}
        >
          {AUTH_COPY.verify.submit}
        </Button>
      </form>

      <p className={styles.aside}>
        <AuthLink href="/feed" tone="muted">
          {AUTH_COPY.verify.later}
        </AuthLink>
      </p>
    </div>
  );
};
