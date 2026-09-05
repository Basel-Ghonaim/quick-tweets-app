import { useCallback, useEffect, useState } from "react";
import { restJourney } from "./restJourney";
import { resolveJourney, type JourneyRead } from "./resolveJourney";
import type { JourneyMove, JourneyRepository, JourneyState } from "./journey.types";

export interface Journey {
  read: JourneyRead;
  state: JourneyState | null;
  advance: (move: JourneyMove) => Promise<void>;
  leave: () => void;
  retry: () => void;
}

/**
 * The server's answer, held in one place and replaced by every response it
 * gives — never derived, and never remembered across a reload.
 */
export const useJourney = (repo: JourneyRepository = restJourney()): Journey => {
  const [read, setRead] = useState<JourneyRead>({ status: "unresolved" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void resolveJourney(repo).then((next) => {
      if (live) setRead(next);
    });

    return () => {
      live = false;
    };
  }, [repo, attempt]);

  const advance = useCallback(
    async (move: JourneyMove) => {
      const state = await repo.advance(move);
      setRead({ status: "resolved", state });
    },
    [repo],
  );

  // The exit never waits on a request: the feed is public, and a dropped
  // network must not trap a reader on a screen they asked to leave.
  const leave = useCallback(() => {
    void repo.advance({ to: "completed" }).catch(() => {});
  }, [repo]);

  const retry = useCallback(() => {
    setRead({ status: "unresolved" });
    setAttempt((n) => n + 1);
  }, []);

  return {
    read,
    state: read.status === "resolved" ? read.state : null,
    advance,
    leave,
    retry,
  };
};
