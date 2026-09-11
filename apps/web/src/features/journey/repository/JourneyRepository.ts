import type { JourneyMove, JourneyState } from "../model";

export interface JourneyRepository {
  read(): Promise<JourneyState>;
  advance(move: JourneyMove): Promise<JourneyState>;
}
