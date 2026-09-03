import { Button, Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { useAskFlow, useVerificationStatus, verifyDestination } from "../../verification";
import { AuthLink, useAuthNavigate } from "../../navigation";
import { Navigate } from "react-router-dom";
import styles from "./Verify.module.css";

export const VerifyAsk = () => {
  const navigate = useAuthNavigate();
  const read = useVerificationStatus();
  const { isSending, error, send } = useAskFlow((resendAvailableInSeconds) =>
    navigate("/auth/verify/code", { state: { resendAvailableInSeconds } }),
  );

  if (!read.resolved) return null;

  const destination = verifyDestination(read.status);
  if (destination === "code") return <Navigate to="/auth/verify/code" replace />;
  if (destination === "done") return <Navigate to="/feed" replace />;

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
        <AuthLink href="/auth/profile" tone="muted">
          {AUTH_COPY.verify.backToProfile}
        </AuthLink>
        <AuthLink href="/feed" tone="muted">
          {AUTH_COPY.verify.later}
        </AuthLink>
      </div>
    </div>
  );
};
