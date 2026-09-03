import { useEffect, useState } from "react";
import { readVerificationStatus, type VerificationStatus } from "./readVerificationStatus";

export type StatusRead =
  | { resolved: false }
  | { resolved: true; status: VerificationStatus | null };

/**
 * The journey's shape depends on an answer only the server has, so the screen
 * waits for it rather than rendering the ask and correcting itself. A failed
 * read resolves to null: the reader is shown the step rather than stranded by
 * a question that could not be asked.
 */
export const useVerificationStatus = (read = readVerificationStatus): StatusRead => {
  const [state, setState] = useState<StatusRead>({ resolved: false });

  useEffect(() => {
    let current = true;

    read()
      .then((status) => current && setState({ resolved: true, status }))
      .catch(() => current && setState({ resolved: true, status: null }));

    return () => {
      current = false;
    };
  }, [read]);

  return state;
};
