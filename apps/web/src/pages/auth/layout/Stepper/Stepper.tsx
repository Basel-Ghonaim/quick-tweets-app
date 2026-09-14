import {
  CheckIcon,
  EnvelopeIcon,
  PencilIcon,
  UserIcon,
} from "@shared/design-system";
import { AUTH_COPY } from "@shared/copy";
import styles from "./Stepper.module.css";

export type StepState = "done" | "current" | "optional" | "skipped";
export type JourneyStepId = "account" | "profile" | "verify";

/** The journey is three fixed steps, so the stepper carries their identities
 *  and a caller supplies only where the reader has got to. */
const STEPS = [
  { id: "account", Icon: UserIcon },
  { id: "profile", Icon: PencilIcon },
  { id: "verify", Icon: EnvelopeIcon },
] as const satisfies readonly { id: JourneyStepId; Icon: typeof UserIcon }[];

interface StepperProps {
  states: Record<JourneyStepId, StepState>;
}

/**
 * It reports progress and never navigates, so it holds nothing focusable —
 * which is also why the minimum hit target has nothing here to apply to.
 */
export const Stepper = ({ states }: StepperProps) => (
  <ol className={styles.root} aria-label={AUTH_COPY.journey.label}>
    {STEPS.map(({ id, Icon }) => {
      const state = states[id];

      return (
        <li
          key={id}
          className={`${styles.step} ${styles[state]}`}
          aria-current={state === "current" ? "step" : undefined}
        >
          <span className={styles.node}>
            {state === "done" ? <CheckIcon size={18} /> : <Icon size={18} />}
          </span>
          <span className={styles.name}>{AUTH_COPY.journey.steps[id]}</span>
          <span className={styles.state}>{AUTH_COPY.journey.states[state]}</span>
        </li>
      );
    })}
  </ol>
);
