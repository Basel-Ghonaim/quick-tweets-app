import type { JourneyMove, JourneyState } from "../model";

export interface JourneyGateway {
  read(): Promise<JourneyState>;
  advance(move: JourneyMove): Promise<JourneyState>;
}
