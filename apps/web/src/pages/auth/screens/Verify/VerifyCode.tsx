import { useMemo } from "react";
import { Button, Input, MessageRegion, Typography } from "@shared/design-system";
import { useCopy } from "@shared/copy";
import { useCodeFlow } from "@shared/channel-verification";
import { verificationMessages } from "./messages";
import { RouteLink } from "@shared/routing";
import styles from "./Verify.module.css";

interface VerifyCodeProps {
  onVerified: () => void;
  onLater: () => void;
}

export const VerifyCode = ({ onVerified, onLater }: VerifyCodeProps) => {
  const copy = useCopy();
  const messages = useMemo(() => verificationMessages(copy), [copy]);
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
    messages,
    resendReadyMessage: copy.auth.verify.resendReady,
  });

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {copy.auth.verify.codeTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {copy.auth.verify.codeSubtitle}
      </Typography>

      {error && <MessageRegion tone="error">{error.message}</MessageRegion>}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Input
          name="code"
          label={copy.auth.verify.codeLabel}
          helperText={copy.auth.verify.codeHint}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          inputMode="text"
          dir="ltr"
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
            {canResend ? copy.auth.verify.resend : copy.auth.verify.resendIn(secondsLeft)}
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
          loadingText={copy.auth.verify.submitting}
        >
          {copy.auth.verify.submit}
        </Button>
      </form>

      <p className={styles.aside}>
        <RouteLink href="/feed" tone="muted" onClick={onLater}>
          {copy.auth.verify.later}
        </RouteLink>
      </p>
    </div>
  );
};
