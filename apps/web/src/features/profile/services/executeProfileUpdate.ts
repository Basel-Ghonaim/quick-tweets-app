import type { AppError } from "@shared/errors";
import type { RequestState } from "@shared/types";
import { profileErrorHandler, type ProfileWords } from "./profileErrorHandler";
import type { UpdatedProfile } from "../model";

/**
 * Drives the setter it is given, so the flow is exercised without a renderer.
 * It commits no identity: a profile update changes neither the session nor the
 * token, and the handle it can return is the User domain's to own.
 */
export const executeProfileUpdate = async (
  setState: (next: RequestState) => void,
  apiCall: () => Promise<UpdatedProfile>,
  words: ProfileWords,
): Promise<void> => {
  setState({ status: "loading", error: null });

  try {
    await apiCall();
    setState({ status: "success", error: null });
  } catch (error) {
    const handled = profileErrorHandler(error as AppError, words);
    setState({ status: "error", error: handled.toSerialized() });
    throw handled;
  }
};
