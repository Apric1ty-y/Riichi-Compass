import { type Game } from "../data/interfaces";

export const undoFields = ["bottomWind", "roundWind", "round", "repeats", "scores", "riichiSticks", "riichi", "playerStats", "handResults", "handSequence"] as const;

export function operationChanged(before: Game, after: Game) {
  return undoFields.some(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

export function restoreOperation(current: Game, snapshot: Game): Game {
  return {
    ...current,
    ...Object.fromEntries(undoFields.map(field => [field, snapshot[field]])),
    scoreHistory: snapshot.scoreHistory,
    pendingEndReason: undefined,
    undoAvailable: false,
  };
}
