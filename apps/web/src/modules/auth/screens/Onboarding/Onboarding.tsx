import { Navigate } from "react-router-dom";
import { Button, MessageRegion, Spinner } from "@shared/design-system";
import { AUTH_COPY } from "@shared/copy";
import { JourneyLayout } from "@pages/auth/layout";
import { useRouteNavigate } from "@shared/routing";
import { useJourney, type JourneyGateway } from "@features/journey";
import { destinationFor } from "./destinationFor";
import { stepStates } from "@pages/auth/layout/Stepper";
import { Profile } from "@pages/auth/screens/Profile";
import { VerifyAsk, VerifyCode } from "@pages/auth/screens/Verify";
import styles from "./Onboarding.module.css";

/**
 * The journey's one route. Which screen renders is the server's answer, so a
 * reload, a second tab and a typed path all resolve the same way.
 */
export const Onboarding = ({ repo }: { repo?: JourneyGateway } = {}) => {
  const { read, state, advance, leave, retry } = useJourney(repo);
  const navigate = useRouteNavigate();
  const destination = destinationFor(read);

  // Verifying has no link to carry it, so it navigates — and never waits on the
  // close, which the feed being public makes safe.
  const exit = () => {
    leave();
    navigate("/feed");
  };

  if (destination === "feed") return <Navigate to="/feed" replace />;
  if (destination === "signin") return <Navigate to="/auth/signin" replace />;

  const position = destination === "pending" || destination === "retry" ? "account" : destination;
  const states = stepStates(position, state?.profileOutcome ?? null);

  return (
    <JourneyLayout states={states}>
      {destination === "pending" && (
        <div className={styles.pending}>
          <Spinner />
        </div>
      )}

      {destination === "retry" && (
        <div className={styles.pending}>
          <MessageRegion tone="error">{AUTH_COPY.onboarding.unavailable}</MessageRegion>
          <Button type="button" onClick={retry}>
            {AUTH_COPY.onboarding.retry}
          </Button>
        </div>
      )}

      {destination === "profile" && (
        <Profile onSettled={(outcome) => advance({ to: "verify", outcome })} />
      )}

      {destination === "verify" && (
        <VerifyAsk
          onSent={() => {
            void advance({ to: "code" });
          }}
          onLater={leave}
        />
      )}

      {destination === "code" && (
        <VerifyCode onVerified={exit} onLater={leave} />
      )}
    </JourneyLayout>
  );
};
