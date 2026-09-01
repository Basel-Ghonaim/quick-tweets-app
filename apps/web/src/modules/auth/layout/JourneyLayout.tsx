import { Outlet, useLocation } from "react-router-dom";
import { Stepper, type JourneyStepId, type StepState } from "../components/Stepper";
import styles from "./JourneyLayout.module.css";

const ORDER = ["account", "profile", "verify"] as const satisfies readonly JourneyStepId[];

const STEP_AT: Record<string, JourneyStepId> = {
  signup: "account",
  profile: "profile",
  verify: "verify",
};

/**
 * The chrome the journey's steps share.
 *
 * It sits between the shell and the steps so the stepper survives a move
 * between them: this route's match does not change as its children do, so the
 * stepper is not remounted and can announce a transition rather than replace
 * itself.
 *
 * Progress is derived from where the reader is rather than remembered. A
 * skipped step is the one state a path cannot tell, and nothing can skip yet —
 * it arrives with the screen that offers it.
 */
export const JourneyLayout = () => {
  const { pathname } = useLocation();
  const current = ORDER.indexOf(STEP_AT[pathname.split("/").pop() ?? ""]);

  const states = Object.fromEntries(
    ORDER.map((id, index) => [
      id,
      index < current ? "done" : index === current ? "current" : "optional",
    ]),
  ) as Record<JourneyStepId, StepState>;

  return (
    <div className={styles.root}>
      <Stepper states={states} />
      <Outlet />
    </div>
  );
};
