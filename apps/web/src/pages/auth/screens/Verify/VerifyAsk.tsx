import { useMemo } from "react";
import { Button, MessageRegion, Typography } from "@shared/design-system";
import { useCopy } from "@shared/copy";
import { useAskFlow } from "@shared/channel-verification";
import { verificationMessages } from "./messages";
import { RouteLink } from "@shared/routing";
import styles from "./Verify.module.css";

interface VerifyAskProps {
  onSent: () => void;
  onLater: () => void;
}

export const VerifyAsk = ({ onSent, onLater }: VerifyAskProps) => {
  const copy = useCopy();
  const messages = useMemo(() => verificationMessages(copy), [copy]);
  const { isSending, error, send } = useAskFlow({
    onSent,
    messages,
  });

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {copy.auth.verify.askTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {copy.auth.verify.askSubtitle}
      </Typography>

      {error && <MessageRegion tone="error">{error.message}</MessageRegion>}

      <div className={styles.ask}>
        <Typography variant="body-small" tone="secondary">
          {copy.auth.verify.reason}
        </Typography>

        <Button
          type="button"
          fullWidth
          isLoading={isSending}
          loadingText={copy.auth.verify.sending}
          onClick={send}
        >
          {copy.auth.verify.send}
        </Button>
      </div>

      <div className={styles.asides}>
        <RouteLink href="/feed" tone="muted" onClick={onLater}>
          {copy.auth.verify.later}
        </RouteLink>
      </div>
    </div>
  );
};
