import Dexie, { type Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

import { none, type Option, some } from "../../lib/option";
import { DefaultSettings, type ScoreSettings } from "../../lib/settings";
import { normalizeMatch } from "../../lib/match";
import { type Game, type HistoricMatch, type IRepository, type PartialGame } from "../interfaces";
import { participantHistory } from "../../lib/history";
import { operationChanged, restoreOperation } from "../../lib/undo";

type Game_ = Game & {
  id: string;
};

function toGame(game: Game_): Game {
  return normalizeMatch({
    ...game,
    roundWind: game.roundWind,
    round: game.round,
    repeats: game.repeats,
    bottomWind: game.bottomWind,
    scores: game.scores,
    riichiSticks: game.riichiSticks,
    riichi: game.riichi,
    settings: game.settings,
  });
}

function fromGame(id: string, game: Game): Game_ {
  return {
    ...game,
    id,
    roundWind: game.roundWind,
    round: game.round,
    repeats: game.repeats,
    bottomWind: game.bottomWind,
    scores: game.scores,
    riichiSticks: game.riichiSticks,
    riichi: game.riichi,
    settings: game.settings,
  };
}

type ScoreSettings_ = ScoreSettings & { id: string };

function toSettings(settings: ScoreSettings_): ScoreSettings {
  return {
    noYakuFu: settings.noYakuFu,
    noYakuDora: settings.noYakuDora,
    openTanyao: settings.openTanyao,
    ryuuiisouHatsu: settings.ryuuiisouHatsu,
    multiYakuman: settings.multiYakuman,
    doubleYakuman: settings.doubleYakuman,
    kiriageMangan: settings.kiriageMangan,
    kazoeYakuman: settings.kazoeYakuman,
    doubleWindFu: settings.doubleWindFu,
    rinshanFu: settings.rinshanFu,
    sanma: settings.sanma,
    northYakuhai: settings.northYakuhai,
    akadora: settings.akadora,
    usePao: settings.usePao,
    otherScoring: settings.otherScoring,
    disabledYaku: settings.disabledYaku,
    enabledLocalYaku: settings.enabledLocalYaku,
  };
}

function fromSettings(id: string, settings: ScoreSettings): ScoreSettings_ {
  return {
    id,
    noYakuFu: settings.noYakuFu,
    noYakuDora: settings.noYakuDora,
    openTanyao: settings.openTanyao,
    ryuuiisouHatsu: settings.ryuuiisouHatsu,
    multiYakuman: settings.multiYakuman,
    doubleYakuman: settings.doubleYakuman,
    kiriageMangan: settings.kiriageMangan,
    kazoeYakuman: settings.kazoeYakuman,
    doubleWindFu: settings.doubleWindFu,
    rinshanFu: settings.rinshanFu,
    sanma: settings.sanma,
    northYakuhai: settings.northYakuhai,
    akadora: settings.akadora,
    usePao: settings.usePao,
    otherScoring: settings.otherScoring,
    disabledYaku: settings.disabledYaku,
    enabledLocalYaku: settings.enabledLocalYaku,
  };
}

class Db extends Dexie {
  public undo!: Table<{ id: string; sessionId?: string; snapshot: Game }>;
  public games!: Table<Game_>;
  public settings!: Table<ScoreSettings_>;
  public history!: Table<HistoricMatch>;
}

const db = new Db("riichi-tracker");

db.version(1).stores({
  games: "++id", // id, roundWind, round, bottomWind, scores
});

db.version(2)
  .stores({
    games: "++id", // id, roundWind, round, repeats, bottomWind, scores, riichiSticks, riichi
  })
  .upgrade((tx) =>
    tx
      .table("games")
      .toCollection()
      .modify((old: PartialGame) => {
        old.riichiSticks = 0;
        old.riichi = [false, false, false, false];
        old.repeats = 0;
      }),
  );

// From here onwards, database updates may include settings changes.
// Only use this if new fields were added. If old fields were changed, we need to be more specific.
function updateSettings(old: { settings?: Partial<ScoreSettings> }) {
  old.settings = { ...DefaultSettings, ...(old.settings ?? {}) };
}

db.version(3)
  .stores({
    games: "++id", // id, roundWind, round, repeats, bottomWind, scores, riichiSticks, riichi, settings
  })
  .upgrade((tx) =>
    tx
      .table("games")
      .toCollection()
      .modify((old: PartialGame) => {
        updateSettings(old);
      }),
  );

db.version(4)
  .stores({
    games: "++id", // id, roundWind, round, repeats, bottomWind, scores, riichiSticks, riichi, settings(..., disabledYaku, enabledLocaledYaku)
    settings: "++id", // id, ...settings
  })
  .upgrade((tx) =>
    tx
      .table("games")
      .toCollection()
      .modify((old: PartialGame) => {
        updateSettings(old);
      }),
  );

db.version(5)
  .stores({
    games: "++id", // id, roundWind, round, repeats, bottomWind, scores, riichiSticks, riichi, settings(..., northYakuhai)
    settings: "++id", // id, ...settings(..., northYakuhai)
  })
  .upgrade(async (tx) => {
    await tx
      .table("games")
      .toCollection()
      .modify((old: PartialGame) => {
        updateSettings(old);
      });
    await tx
      .table("settings")
      .toCollection()
      .modify((old: Partial<ScoreSettings>) => {
        old.northYakuhai = false;
      });
  });

db.version(6).stores({ games: "++id", settings: "++id", history: "id, ownerId, endedAt" });
db.version(7).stores({ games: "++id", settings: "++id", history: "id, ownerId, endedAt" }).upgrade(async tx => {
  const table = tx.table<HistoricMatch>("history");
  const oldRecords = await table.toArray();
  const allRecords = oldRecords.flatMap(record => participantHistory(record.game, record.savedAt));
  await table.bulkPut(allRecords);
  const retainedIds = new Set(allRecords.map(record => record.id));
  await table.bulkDelete(oldRecords.filter(record => !retainedIds.has(record.id)).map(record => record.id));
});

db.version(8).stores({ games: "++id", settings: "++id", history: "id, ownerId, endedAt", undo: "id" });

export const repository: IRepository = {
  async undoGame(id) {
    await db.transaction("rw", db.games, db.undo, async () => {
      const stored = await db.games.get(id);
      const undo = await db.undo.get(id);
      if (!stored || stored.endedAt || !undo || undo.sessionId !== stored.sessionId) throw new Error("No operation to undo");
      await db.games.put(fromGame(id, restoreOperation(toGame(stored), undo.snapshot)));
      await db.undo.delete(id);
    });
  },
  useHistory(ownerId) {
    return useLiveQuery(() => (ownerId == null ? db.history.toCollection() : db.history.where("ownerId").equals(ownerId)).reverse().sortBy("endedAt"), [ownerId]);
  },
  async archiveGame(id) {
    await db.transaction("rw", db.games, db.history, async () => {
      const stored = await db.games.get(id);
      if (!stored?.endedAt) throw new Error("Match must be finished before saving");
      const game = toGame(stored);
      const records = participantHistory(game);
      await db.history.bulkPut(records);
      await db.games.put(fromGame(id, records[0].game));
    });
  },
  async discardFinishedGame(id) {
    await db.transaction("rw", db.games, async () => {
      const stored = await db.games.get(id);
      if (!stored?.endedAt) throw new Error("Match must be finished before discarding");
      await db.games.put({ ...stored, historyDisposition: "discarded" });
    });
  },
  async getGame(id): Promise<Option<Game>> {
    const games = await db.games.where("id").equals(id).toArray();
    if (!games.length) {
      return none();
    }
    const [game] = games;
    return some(toGame(game));
  },
  useGame(id, options = { enabled: true }): Option<Game> | null {
    const games = useLiveQuery<Game_[] | null>(
      () =>
        options.enabled ? db.games.where("id").equals(id).toArray() : null,
      [id],
    );
    if (games == null) {
      return null;
    }
    if (!games.length) {
      return none();
    }
    const [game] = games;
    return some(toGame(game));
  },
  async setGame(id: string, game: Game): Promise<void> {
    await db.transaction("rw", db.games, db.undo, async () => {
      const stored = await db.games.get(id);
      const previous = stored && stored.sessionId === game.sessionId ? toGame(stored) : null;
      const next = normalizeMatch(game);
      if (previous && !previous.endedAt && !next.endedAt) {
        if (operationChanged(previous, next)) {
          await db.undo.put({ id, sessionId: previous.sessionId, snapshot: previous });
          next.undoAvailable = true;
        } else next.undoAvailable = previous.undoAvailable ?? false;
      } else {
        await db.undo.delete(id);
        next.undoAvailable = false;
      }
      if (previous && !previous.endedAt) {
        const changed = previous.scores.some((score, i) => score !== next.scores[i]);
        const settled = previous.handSequence !== next.handSequence;
        next.scoreHistory = previous.scoreHistory;
        if (changed || settled) {
          next.scoreHistory = [...(previous.scoreHistory ?? []), {
            at: new Date().toISOString(),
            label: settled ? `第${next.handSequence}局结算` : "点数变动",
            scores: [...next.scores], riichiSticks: next.riichiSticks,
          }];
        }
        if (changed && next.scores.some((score) => score < 0)) {
          next.pendingEndReason = "有玩家点数小于 0，是否结束对局？";
        }
      }
      await db.games.put(fromGame(id, next));
    });
  },
  async getSettings(id: string): Promise<Option<ScoreSettings>> {
    const settings = await db.settings.where("id").equals(id).toArray();
    if (!settings.length) {
      return none();
    }
    const [s] = settings;
    return some(toSettings(s));
  },
  async setSettings(id: string, settings: ScoreSettings): Promise<void> {
    await db.settings.put(fromSettings(id, settings));
  },
  useSettings(
    id: string,
    options = { enabled: true },
  ): Option<ScoreSettings> | null {
    const settings = useLiveQuery<ScoreSettings_[] | null>(() =>
      options.enabled ? db.settings.where("id").equals(id).toArray() : null,
    );
    if (settings == null) {
      return null;
    }
    if (!settings.length) {
      return none();
    }
    const [s] = settings;
    return some(toSettings(s));
  },
};
