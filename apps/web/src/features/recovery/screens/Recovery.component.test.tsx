import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";
import { sessionReducer } from "@shared/session";
import { Recovery } from "./Recovery";
import type { RecoveryPosition } from "../model";
import type { RecoveryGateway } from "../gateway";

const at = (over: Partial<RecoveryPosition> = {}): RecoveryPosition => ({
  step: "code",
  maskedAddress: "h•••••@example.test",
  resendAvailableIn: 0,
  canResend: true,
  ...over,
});

const gatewayOf = (over: Partial<RecoveryGateway> = {}): RecoveryGateway => ({
  position: async () => at(),
  request: async () => at(),
  resend: async () => at(),
  confirm: async () => {},
  apply: async () => {},
  ...over,
});

/* The flow dispatches on a completed reset and its links read the search
   params, so a store and a router are what this screen needs to mount. */
const mount = (repo: RecoveryGateway) =>
  render(
    <Provider store={configureStore({ reducer: { session: sessionReducer } })}>
      <MemoryRouter initialEntries={["/auth/recovery"]}>
        <Recovery repo={repo} />
      </MemoryRouter>
    </Provider>,
  );

describe("the step chooses the screen", () => {
  it("renders the step the position reports, not the one the client assumes", async () => {
    mount(gatewayOf({ position: async () => at({ step: "request" }) }));

    expect(
      await screen.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeTruthy();
  });
});

describe("a failed read offers a retry", () => {
  it("says the recovery is unavailable and offers a retry, never the first screen", async () => {
    mount(
      gatewayOf({
        position: async () => {
          throw createAppError("network", "offline");
        },
      }),
    );

    expect(await screen.findByText(AUTH_COPY.recovery.unavailable)).toBeTruthy();
    expect(screen.getByRole("button", { name: AUTH_COPY.recovery.retry })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeNull();
  });
});
