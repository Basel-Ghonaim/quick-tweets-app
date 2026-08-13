import { restAuth } from "./restAuth";

/**
 * Public session-refresh capability for external consumers — e.g. the app's
 * composition root wiring the API client's token-refresh callback.
 *
 * A thin delegating adapter: it carries no HTTP logic or endpoint knowledge of
 * its own. `restAuth.refresh` remains the single owner of the refresh contract;
 * exposing this narrow capability lets consumers refresh a session without
 * depending on the repository's full surface.
 */
export const refreshSession = async (): Promise<string> =>
  (await restAuth().refresh()).accessToken;
