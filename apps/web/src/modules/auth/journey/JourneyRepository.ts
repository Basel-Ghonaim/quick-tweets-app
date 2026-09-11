import type { JourneyMove, JourneyState } from "./journey.types";

export interface JourneyRepository {
  read(): Promise<JourneyState>;
  advance(move: JourneyMove): Promise<JourneyState>;
}
