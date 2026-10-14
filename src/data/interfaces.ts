import { type Wind } from "../lib/hand";
import { type Option } from "../lib/option";
import { type ScoreSettings } from "../lib/settings";

export type RepositoryProvider = () => IRepository;

export interface IRepository {
  getGame: (id: string) => Promise<Option<Game>>;
  setGame: (id: string, game: Game) => Promise<void>;
  useGame: (id: string, options?: { enabled: boolean }) => Option<Game> | null;
  archiveGame: (id: string) => Promise<void>;
  discardFinishedGame: (id: string) => Promise<void>;
  useHistory: (ownerId?: string) => HistoricMatch[] | undefined;

  getSettings: (id: string) => Promise<Option<ScoreSettings>>;
  setSettings: (id: string, settings: ScoreSettings) => Promise<void>;
  useSettings: (
    id: string,
    options?: { enabled: boolean },
  ) => Option<ScoreSettings> | null;
}

export interface Game {
  initialBottomWind?: Wind;
  sessionId?: string;
  players?: PlayerIdentity[];
  playerStats?: PlayerStats[];
  handResults?: HandResult[];
  ptSettings?: PtSettings;
  scoreHistory?: ScoreSnapshot[];
  handSequence?: number;
  pendingEndReason?: string;
  endedAt?: string;
  historyDisposition?: "saved" | "discarded";
  startedAt?: string;
  bottomWind: Wind;
  round: number;
  roundWind: Wind;
  repeats: number;
  scores: number[];
  riichiSticks: number;
  riichi: boolean[];
  settings: ScoreSettings;
}

// Stable player identity is independent of the rotating seat wind.
export interface PlayerIdentity {
  playerId: string;
  displayName: string;
  userId?: string;
}

export interface HistoricMatch {
  id: string;
  ownerId: string;
  playerIndex: number;
  participantUserId?: string;
  savedAt: string;
  endedAt: string;
  rank: number;
  tied: boolean;
  points: number;
  totalPt: number;
  game: Game;
}

export interface PlayerStats {
  riichi: number;
  wins: number;
  dealIns: number;
}

export interface HandResult {
  at: string;
  handNumber?: number;
  roundWind?: Wind;
  round?: number;
  repeats?: number;
  kind: "ron" | "tsumo" | "draw" | "abort" | "chombo" | "unknown";
  winner?: number;
  dealtIn?: number;
  violationPlayer?: number;
  tenpai?: number[];
  riichiPlayers?: number[];
  han?: number;
  fu?: number;
  deltas: number[];
  scores: number[];
}

export interface PtSettings {
  tieBreak?: "split" | "seat";
  startPoints: number;
  returnPoints: number;
  uma: number[];
  oka: boolean;
  awardSupply: boolean;
}

export interface ScoreSnapshot {
  at: string;
  label: string;
  scores: number[];
  riichiSticks: number;
}

export type PartialGame = Partial<Game> & { settings: Partial<ScoreSettings> };
