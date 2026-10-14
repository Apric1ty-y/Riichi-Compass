import { type Game, type HistoricMatch } from "../data/interfaces";
import { normalizeMatch } from "./match";
import { calculatePt, loadPtSettings, validPtSettings } from "./pt";

export function participantHistory(game: Game, savedAt = new Date().toISOString()): HistoricMatch[] {
  if (!game.endedAt) throw new Error("Match must be finished before saving");
  const normalized = normalizeMatch(game);
  const ptSettings = validPtSettings(game.ptSettings, game.scores.length) ? game.ptSettings : loadPtSettings(game.scores.length);
  const snapshot = { ...normalized, ptSettings, historyDisposition: "saved" as const };
  const results = calculatePt(snapshot, ptSettings);
  const records = normalized.players!.map((player, playerIndex) => {
    const ownerId = player.userId ?? `local:${player.playerId}`;
    const result = results.find(row => row.index === playerIndex)!;
    return {
      id: `${game.sessionId ?? `legacy-${game.endedAt}`}:${ownerId}`,
      ownerId, playerIndex, participantUserId: player.userId,
      savedAt, endedAt: game.endedAt!, rank: result.rank, tied: result.tied,
      points: game.scores[playerIndex], totalPt: result.total, game: snapshot,
    };
  });
  if (new Set(records.map(record => record.ownerId)).size !== records.length) throw new Error("A user cannot occupy multiple seats");
  return records;
}
