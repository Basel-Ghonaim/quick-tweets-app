import { Button, Input, Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { useVerifyFlow } from "../../verification";
import { AuthLink, useAuthNavigate } from "../../navigation";
import styles from "./Verify.module.css";

export const Verify = () => {
  const navigate = useAuthNavigate();

  const {
    stage,
    code,
    setCode,
    isSending,
    isSubmitting,
    error,
    secondsLeft,
    canResend,
    announcement,
    send,
    submit,
  } = useVerifyFlow(
    () => navigate("/feed"),
    undefined,
    AUTH_COPY.verify.resendReady,
  );

  const asking = stage === "ask";

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {asking ? AUTH_COPY.verify.askTitle : AUTH_COPY.verify.codeTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {asking ? AUTH_COPY.verify.askSubtitle : AUTH_COPY.verify.codeSubtitle}
      </Typography>

      {error && <MessageRegion tone="error">{error.message}</MessageRegion>}

      {asking ? (
        <div className={styles.ask}>
          <Typography variant="body-small" tone="secondary">
            {AUTH_COPY.verify.reason}
          </Typography>

          <Button
            type="button"
            fullWidth
            isLoading={isSending}
            loadingText={AUTH_COPY.verify.sending}
            onClick={send}
          >
            {AUTH_COPY.verify.send}
          </Button>
        </div>
      ) : (
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
              disabled={!canResend || isSending}
              onClick={send}
            >
              {canResend
                ? AUTH_COPY.verify.resend
                : AUTH_COPY.verify.resendIn(secondsLeft)}
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
      )}

      <p className={styles.aside}>
        <AuthLink href="/feed" tone="muted">
          {AUTH_COPY.verify.later}
        </AuthLink>
      </p>
    </div>
  );
};
