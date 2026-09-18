import { Button, MessageRegion, Spinner } from "@shared/design-system";
import { useCopy } from "@shared/copy";
import { useRouteNavigate } from "@shared/routing";
import { useRecoveryFlow } from "../hooks";
import { RecoveryCode, RecoveryPassword, RecoveryRequest } from "./steps";
import styles from "./Recovery.module.css";

/**
 * Recovery's one route. Which step renders is the server's answer, so a reload,
 * a second tab and a typed path all resolve the same way.
 */
export const Recovery = () => {
  const copy = useCopy();
  const navigate = useRouteNavigate();

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
  } = useRecoveryFlow(() =>
    navigate("/auth/signin", { state: { notice: copy.auth.recovery.done } }),
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
        <MessageRegion tone="error">{copy.auth.recovery.unavailable}</MessageRegion>
        <Button type="button" onClick={retry}>
          {copy.auth.recovery.retry}
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
