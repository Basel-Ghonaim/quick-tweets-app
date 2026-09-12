import { restSession } from "./restSession";

/** The refresh callback the composition root hands the API client: the full
 *  refresh, narrowed to the token it asks for. */
export const refreshSession = async (): Promise<string> =>
  (await restSession().refresh()).accessToken;
