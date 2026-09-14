import type { JourneyRead } from "@features/journey";
import type { Destination } from "../model";

/**
 * A read that failed is not an answer of `none`: treating it as one would eject
 * a reader whose journey is open on the server.
 */
export const destinationFor = (read: JourneyRead): Destination => {
  if (read.status === "unresolved") return "pending";
  if (read.status === "failed") return read.unauthorized ? "signin" : "retry";

  return read.state.phase === "none" ? "feed" : read.state.phase;
};
