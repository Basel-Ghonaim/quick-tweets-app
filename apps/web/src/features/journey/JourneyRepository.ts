import type { JourneyMove, JourneyState } from "@features/journey/model";

export interface JourneyRepository {
  read(): Promise<JourneyState>;
  advance(move: JourneyMove): Promise<JourneyState>;
}
