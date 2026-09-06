import type { ReactNode } from "react";
import { Stepper, type JourneyStepId, type StepState } from "../components/Stepper";
import styles from "./JourneyLayout.module.css";

interface JourneyLayoutProps {
  states: Record<JourneyStepId, StepState>;
  children: ReactNode;
}

/** The chrome the journey's steps share. Progress is reported to it, never derived here. */
export const JourneyLayout = ({ states, children }: JourneyLayoutProps) => (
  <div className={styles.root}>
    <Stepper states={states} />
    {children}
  </div>
);
