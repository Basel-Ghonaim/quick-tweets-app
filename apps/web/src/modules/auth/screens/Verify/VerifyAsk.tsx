import { Button, Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { useAskFlow } from "../../verification";
import { AuthLink } from "../../navigation";
import styles from "./Verify.module.css";

interface VerifyAskProps {
  onSent: (resendAvailableInSeconds: number) => void;
  onLater: () => void;
}

export const VerifyAsk = ({ onSent, onLater }: VerifyAskProps) => {
  const { isSending, error, send } = useAskFlow(onSent);

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.verify.askTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.verify.askSubtitle}
      </Typography>

      {error && <MessageRegion tone="error">{error.message}</MessageRegion>}

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

      <div className={styles.asides}>
        <AuthLink href="/feed" tone="muted" onClick={onLater}>
          {AUTH_COPY.verify.later}
        </AuthLink>
      </div>
    </div>
  );
};
