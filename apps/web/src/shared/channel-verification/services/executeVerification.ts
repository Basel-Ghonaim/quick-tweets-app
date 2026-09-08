import type { AppError } from "@shared/errors";
import type { RequestState } from "@shared/types";
import { verificationErrorHandler, type VerificationMessages } from "./verificationErrorHandler";

/** Drives the setter it is given, so the flow is exercised without a renderer.
 *  It commits no identity: proving an address changes no session. */
export const executeVerification = async <T>(
  setState: (next: RequestState) => void,
  apiCall: () => Promise<T>,
  messages?: VerificationMessages,
): Promise<T> => {
  setState({ status: "loading", error: null });

  try {
    const result = await apiCall();
    setState({ status: "success", error: null });
    return result;
  } catch (error) {
    const handled = verificationErrorHandler(error as AppError, messages);
    setState({ status: "error", error: handled.toSerialized() });
    throw handled;
  }
};
