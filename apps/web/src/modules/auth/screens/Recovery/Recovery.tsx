import { useState } from "react";
import { Button, Spinner } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { useAuthNavigate } from "../../navigation";
import { useAuthDispatch } from "../../store/hooks";
import { authActions } from "../../store";
import { screenFor, useRecovery, type RecoveryRepository } from "../../recovery";
import { RecoveryRequest } from "./RecoveryRequest";
import { RecoveryCode } from "./RecoveryCode";
import { RecoveryPassword } from "./RecoveryPassword";
import styles from "./Recovery.module.css";

/**
 * Recovery's one route. Which step renders is the server's answer, so a reload,
 * a second tab and a typed path all resolve the same way.
 */
export const Recovery = ({ repo }: { repo?: RecoveryRepository } = {}) => {
  const { read, position, request, resend, confirm, apply, retry } = useRecovery(repo);
  const [justAsked, setJustAsked] = useState(false);
  /* Not a claim about which step the reader is on — the server still owns that.
     It is a reader abandoning this attempt, and a reload discards it. */
  const [restarting, setRestarting] = useState(false);
  const navigate = useAuthNavigate();
  const dispatch = useAuthDispatch();
  const screen = screenFor(read);

  const finish = async (newPassword: string) => {
    await apply(newPassword);
    // Every session for the account is gone server-side, including this
    // browser's: keeping a token would earn a 401 bounce instead of a
    // confirmation.
    dispatch(authActions.authLogout());
    navigate("/auth/signin", { state: { notice: AUTH_COPY.recovery.done } });
  };

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

  if (screen === "request" || restarting) {
    return (
      <RecoveryRequest
        notice={justAsked && !restarting ? AUTH_COPY.recovery.lapsed : undefined}
        onSubmit={async (email) => {
          await request(email);
          setRestarting(false);
          setJustAsked(true);
        }}
      />
    );
  }

  if (screen === "code") {
    return (
      <RecoveryCode
        position={position!}
        confirmation={justAsked ? AUTH_COPY.recovery.sent : undefined}
        onSubmit={confirm}
        onResend={resend}
        onRestart={() => setRestarting(true)}
      />
    );
  }

  return <RecoveryPassword position={position!} onSubmit={finish} />;
};
