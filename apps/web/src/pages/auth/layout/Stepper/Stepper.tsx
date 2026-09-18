import {
  CheckIcon,
  EnvelopeIcon,
  PencilIcon,
  UserIcon,
} from "@shared/design-system";
import { useCopy } from "@shared/copy";
import type { JourneyStepId, StepState } from "../../model";
import styles from "./Stepper.module.css";

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
export const Stepper = ({ states }: StepperProps) => {
  const copy = useCopy();

  return (
    <ol className={styles.root} aria-label={copy.auth.journey.label}>
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
            <span className={styles.name}>{copy.auth.journey.steps[id]}</span>
            <span className={styles.state}>{copy.auth.journey.states[state]}</span>
          </li>
        );
      })}
    </ol>
  );
};
