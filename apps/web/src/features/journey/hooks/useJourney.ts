import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@shared/session";
import { restJourney } from "@features/journey/repository";
import { resolveJourney } from "@features/journey/services";
import type { JourneyMove, JourneyRead, JourneyState } from "@features/journey/model";
import type { JourneyRepository } from "@features/journey/repository";

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
export const useJourney = (given?: JourneyRepository): Journey => {
  const { sessionSettled } = useSession();
  // Held across renders: the effect is keyed on it, and a fresh one each render
  // would read the journey forever.
  const repo = useMemo(() => given ?? restJourney(), [given]);
  const [read, setRead] = useState<JourneyRead>({ status: "unresolved" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // The restore does not block the first render, so the journey is asked only
    // once the session has answered: a 401 from asking early is not an answer.
    if (!sessionSettled) return;

    let live = true;
    void resolveJourney(repo).then((next) => {
      if (live) setRead(next);
    });

    return () => {
      live = false;
    };
  }, [repo, attempt, sessionSettled]);

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
