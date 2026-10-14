import { type Game, type HandResult, type PlayerIdentity, type ScoreSnapshot } from "../data/interfaces";

export function defaultPlayers(count: number): PlayerIdentity[] {
  return Array.from({ length: count }, (_, i) => ({ playerId: `p${i + 1}`, displayName: `p${i + 1}` }));
}

export function normalizeMatch(game: Game): Game {
  return {
    ...game,
    players: game.players ?? defaultPlayers(game.scores.length),
    playerStats: game.playerStats ?? game.scores.map(() => ({ riichi: 0, wins: 0, dealIns: 0 })),
    handSequence: game.handSequence ?? 0,
    scoreHistory: game.scoreHistory ?? [{ at: new Date().toISOString(), label: "起始", scores: [...game.scores], riichiSticks: game.riichiSticks }],
  };
}

export function changePlayerStat(game: Game, index: number, stat: "riichi" | "wins" | "dealIns", delta: number) {
  return normalizeMatch(game).playerStats!.map((stats, i) => i === index
    ? { ...stats, [stat]: Math.max(0, stats[stat] + delta) }
    : { ...stats });
}

export function recordHand(game: Game, scores: number[], details: Pick<HandResult, "kind"> & Partial<HandResult>): HandResult[] {
  return [...(game.handResults ?? []), {
    at: new Date().toISOString(),
    roundWind: game.roundWind,
    round: game.round,
    repeats: game.repeats,
    riichiPlayers: game.riichi.flatMap((value, i) => value ? [i] : []),
    deltas: scores.map((score, i) => score - game.scores[i]),
    scores: [...scores],
    ...details,
  }];
}

export function allHandResults(game: Game): HandResult[] {
  const recorded = game.handResults ?? [];
  const history = game.scoreHistory ?? [];
  const legacy: HandResult[] = [];
  history.forEach((point, i) => {
    const number = /^第(\d+)局结算$/.exec(point.label)?.[1];
    if (!number || i === 0 || recorded.some((hand) => hand.handNumber === Number(number))) return;
    legacy.push({ at: point.at, handNumber: Number(number), kind: "unknown", scores: [...point.scores], deltas: point.scores.map((score, player) => score - history[i - 1].scores[player]) });
  });
  return [...legacy, ...recorded];
}

// Uniformly spaced snapshots: a marker is needed only where the slope changes.
export function isScoreTurn(history: ScoreSnapshot[], index: number, player: number): boolean {
  if (index === 0 || index === history.length - 1) return false;
  const before = history[index].scores[player] - history[index - 1].scores[player];
  const after = history[index + 1].scores[player] - history[index].scores[player];
  return before !== after;
}

export function settledHand(game: Game): Pick<Game, "handSequence" | "pendingEndReason"> {
  const finalRound = game.settings.sanma == null ? 4 : 3;
  return {
    handSequence: (game.handSequence ?? 0) + 1,
    pendingEndReason: game.roundWind === "2" && game.round === finalRound
      ? `南${finalRound === 4 ? "四" : "三"}局已结算，是否结束对局？`
      : game.pendingEndReason,
  };
}
