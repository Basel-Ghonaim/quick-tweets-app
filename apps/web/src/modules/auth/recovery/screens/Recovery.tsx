import { Button, Spinner } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { useAuthNavigate } from "../../navigation";
import { useRecoveryFlow } from "../hooks";
import type { RecoveryRepository } from "../repository";
import { RecoveryCode, RecoveryPassword, RecoveryRequest } from "./steps";
import styles from "./Recovery.module.css";

/**
 * Recovery's one route. Which step renders is the server's answer, so a reload,
 * a second tab and a typed path all resolve the same way.
 */
export const Recovery = ({ repo }: { repo?: RecoveryRepository } = {}) => {
  const navigate = useAuthNavigate();

  const {
    screen,
    position,
    notice,
    confirmation,
    initialEmail,
    ask,
    restart,
    confirm,
    resend,
    apply,
    retry,
  } = useRecoveryFlow(repo, () =>
    navigate("/auth/signin", { state: { notice: AUTH_COPY.recovery.done } }),
  );

  if (screen === "pending") {
    return (
      <div className={styles.waiting}>
        <Spinner />
      </div>
    );
  }

  if (screen === "retry") {
    return (
      <div className={styles.waiting}>
        <MessageRegion tone="error">{AUTH_COPY.recovery.unavailable}</MessageRegion>
        <Button type="button" onClick={retry}>
          {AUTH_COPY.recovery.retry}
        </Button>
      </div>
    );
  }

  if (screen === "request") {
    return <RecoveryRequest initialEmail={initialEmail} notice={notice} onSubmit={ask} />;
  }

  if (screen === "code") {
    return (
      <RecoveryCode
        position={position!}
        confirmation={confirmation}
        onSubmit={confirm}
        onResend={resend}
        onRestart={restart}
      />
    );
  }

  return <RecoveryPassword onSubmit={apply} />;
};
