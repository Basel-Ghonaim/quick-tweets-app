import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupAuthClient } from "./src/shared/api";
import { ERROR_COPY } from "./src/shared/copy";
import { setupErrorMessages } from "./src/shared/errors";
import { server } from "./testing/server";

// The words an unmapped failure is reported in, supplied as app/bootstrap.ts
// supplies them, so this lane shows a refusal as the application does.
setupErrorMessages(ERROR_COPY);

// What app/bootstrap.ts does for the application, done once for the lane. The
// client carries no interceptors until this runs, so nothing normalizes an
// error and `resolveJourney` cannot tell a 401 from any other failure. It lives
// here because a page or a capability may not name the transport — its own
// fence forbids it — and because attaching interceptors twice would stack them.
setupAuthClient(() => null, {
  refreshToken: async () => {
    throw new Error("no session to refresh in this lane");
  },
  onTokenRefreshed: () => {},
  onSessionExpired: () => {},
});

// `error` rather than a pass-through: this lane reaches nothing but the API, so
// an unhandled request is always a test that forgot to say what the server
// answers, and silence would let it assert a state it never meant to create.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Renders leak into the next test without this, and the lane's whole point is
// that one mount's lifecycle is observable on its own.
afterEach(cleanup);
