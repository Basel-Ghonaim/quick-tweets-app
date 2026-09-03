export interface ResendCooldownState {
  secondsLeft: number;
  /** True on the single tick that ends the wait, so the end is announced once
   *  rather than on every render while the control is enabled. */
  justEnded: boolean;
}

export type ResendCooldownEvent =
  | { type: "started"; seconds: number }
  | { type: "ticked" };

export const resendCooldownInitial: ResendCooldownState = {
  secondsLeft: 0,
  justEnded: false,
};

export const resendCooldownReducer = (
  state: ResendCooldownState,
  event: ResendCooldownEvent,
): ResendCooldownState => {
  switch (event.type) {
    case "started":
      return { secondsLeft: Math.max(0, Math.ceil(event.seconds)), justEnded: false };
    case "ticked": {
      if (state.secondsLeft === 0) return state.justEnded ? { ...state, justEnded: false } : state;

      const secondsLeft = state.secondsLeft - 1;
      return { secondsLeft, justEnded: secondsLeft === 0 };
    }
  }
};

export const canResend = (state: ResendCooldownState): boolean => state.secondsLeft === 0;
