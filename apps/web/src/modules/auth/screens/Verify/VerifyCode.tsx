import { Button, Input, MessageRegion, Typography } from "@shared/design-system";
import { AUTH_COPY } from "@shared/copy";
import { useCodeFlow } from "@shared/channel-verification";
import { VERIFICATION_MESSAGES } from "./messages";
import { RouteLink } from "@shared/routing";
import styles from "./Verify.module.css";

interface VerifyCodeProps {
  /** Handed over by the ask, which was told it. A reload loses it, and the
   *  first resend asks the server for it again. */
  openingWindow?: number;
  onVerified: () => void;
  onLater: () => void;
}

export const VerifyCode = ({ openingWindow, onVerified, onLater }: VerifyCodeProps) => {
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
  } = useCodeFlow({
    onVerified,
    messages: VERIFICATION_MESSAGES,
    resendReadyMessage: AUTH_COPY.verify.resendReady,
    openingWindow,
  });

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
        <RouteLink href="/feed" tone="muted" onClick={onLater}>
          {AUTH_COPY.verify.later}
        </RouteLink>
      </p>
    </div>
  );
};
