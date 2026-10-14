import { type Game, type PtSettings } from "../data/interfaces";

export function defaultPtSettings(count: number): PtSettings {
  return count === 4
    ? { startPoints: 25000, returnPoints: 30000, uma: [30, 10, -10, -30], oka: true, awardSupply: true, tieBreak: "split" }
    : { startPoints: 35000, returnPoints: 35000, uma: [20, 0, -20], oka: false, awardSupply: true, tieBreak: "split" };
}

export function validPtSettings(value: unknown, count: number): value is PtSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as PtSettings;
  return Number.isFinite(settings.startPoints) && settings.startPoints >= 0
    && Number.isFinite(settings.returnPoints) && settings.returnPoints >= 0
    && Array.isArray(settings.uma) && settings.uma.length === count && settings.uma.every(Number.isFinite)
    && typeof settings.oka === "boolean" && typeof settings.awardSupply === "boolean"
    && (settings.tieBreak == null || settings.tieBreak === "split" || settings.tieBreak === "seat");
}

export function loadPtSettings(count: number): PtSettings {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`pt-settings-${count}`) ?? "null");
    if (validPtSettings(stored, count)) return stored;
  } catch { /* Ignore invalid saved preferences. */ }
  return defaultPtSettings(count);
}

export function calculatePt(game: Game, settings: PtSettings) {
  const split = settings.tieBreak !== "seat";
  const seatPriority = (index: number) => (Number(game.initialBottomWind ?? "1") - 1 + index) % game.scores.length;
  const order = game.scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score || seatPriority(a.index) - seatPriority(b.index));
  const topCount = split ? order.filter((player) => player.score === order[0].score).length : 1;
  return order.map((player, rankIndex) => {
    const firstRank = split ? order.findIndex((other) => other.score === player.score) : rankIndex;
    const ties = split ? order.filter((other) => other.score === player.score).length : 1;
    const uma = settings.uma.slice(firstRank, firstRank + ties).reduce((sum, value) => sum + value, 0) / ties;
    const supply = settings.awardSupply && firstRank === 0 ? game.riichiSticks * 1000 / topCount : 0;
    const score = player.score + supply;
    const raw = (score - settings.returnPoints) / 1000;
    const oka = settings.oka && firstRank === 0
      ? (settings.returnPoints - settings.startPoints) * game.scores.length / 1000 / topCount : 0;
    return { index: player.index, rank: firstRank + 1, tied: ties > 1, score, supply, raw, uma, oka, total: raw + uma + oka };
  });
}

export function formatPt(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded > 0 ? `+${rounded}` : rounded === 0 ? "0" : String(rounded);
}
