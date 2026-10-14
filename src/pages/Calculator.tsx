import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HiArrowLeft } from "react-icons/hi";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "../components/Button";
import HanFu from "../components/calculator/HanFu";
import PointsResult from "../components/calculator/PointsResult";
import WindSelect from "../components/calculator/WindSelect";
import CircleButton from "../components/CircleButton";
import BlocksShuffleThree from "../components/loading/react-svg-spinners/BlocksShuffleThree";
import H from "../components/text/H";
import { type Game } from "../data/interfaces";
import { calculateHanFu, type CalculatedPoints, ceil100, makeScore, nextWind } from "../lib/hand";
import { type ScoreSettings } from "../lib/settings";
import { type CalculatorState, type CompassState } from "../lib/states";
import { replicate } from "../lib/util";
import { changePlayerStat, recordHand, settledHand } from "../lib/match";
import useUiText from "../hooks/useUiText";
import { useDb } from "../providers/DbProvider";

export default function Calculator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const locState: CalculatorState =
    (location.state as CalculatorState | null) ?? {
      t: "load",
      id: "$global",
    };

  const db = useDb();
  const globalSettings = db.useSettings("$global", {
    enabled: locState.t === "load",
  });
  useEffect(() => {
    if (globalSettings == null) {
      return;
    }
    if (!globalSettings.ok) {
      void navigate("/", { replace: true });
    }
  }, [globalSettings, navigate]);

  // The id is only used if we're transferring, in which case it will exist.
  const game = db.useGame(locState.id, { enabled: locState.t === "transfer" });

  return (
    <div className="min-h-screen bg-slate-200 text-black dark:bg-gray-900 dark:text-white">
      {locState.t === "transfer" ? (
        game == null ? (
          <div className="flex h-screen w-screen flex-col items-center justify-center">
            <div className="h-24 w-24 fill-black dark:fill-white">
              <BlocksShuffleThree />
            </div>
          </div>
        ) : game.ok ? (
          <CalculatorWithGame
            locState={locState}
            globalSettings={null}
            game={game.value}
          />
        ) : (
          <div className="flex h-screen w-screen flex-col items-center justify-center">
            <div className="font-mono">
              <H.Red>
                {t(
                  "calc.error.gameDoesNotExist",
                  "Error: Game {{id}} does not exist.",
                  { id: locState.id },
                )}
              </H.Red>
            </div>
          </div>
        )
      ) : globalSettings == null ? (
        <div className="flex h-screen w-screen flex-col items-center justify-center">
          <div className="h-24 w-24 fill-black dark:fill-white">
            <BlocksShuffleThree />
          </div>
        </div>
      ) : globalSettings.ok ? (
        <CalculatorWithGame
          locState={locState}
          globalSettings={globalSettings.value}
          game={null}
        />
      ) : (
        <div className="flex h-screen w-screen flex-col items-center justify-center">
          <div className="font-mono">
            <H.Red>
              {t(
                "calc.error.settingsIdDoesNotExist",
                "Error: Settings {{id}} does not exist.",
                { id: locState.id },
              )}
            </H.Red>
          </div>
        </div>
      )}
    </div>
  );
}


function CalculatorWithGame({
  locState, globalSettings, game,
}: {
  locState: CalculatorState;
  globalSettings: ScoreSettings | null;
  game: Game | null;
}) {
  const { t } = useTranslation();
  const u = useUiText();
  const navigate = useNavigate();
  const db = useDb();
  const settings = (game ? game.settings : globalSettings)!;
  const isSanma = settings.sanma != null;
  const seatWind = locState.t === "transfer" ? locState.seatWind : "1";
  const agari = locState.t === "transfer" ? locState.agari : "tsumo";
  const [han, setHan] = useState(1);
  const [fu, setFu] = useState(30);
  const hanFuScores = makeScore(
    seatWind === "1", agari, isSanma, calculateHanFu(han, fu, settings),
  );

  const transferScores = async (
    calcPoints: Exclude<CalculatedPoints, { agari: null }>,
  ) => {
    if (
      game == null ||
      locState.t !== "transfer" ||
      locState.agari !== calcPoints.agari
    ) {
      return;
    }

    const {
      bottomWind,
      roundWind,
      round,
      repeats,
      scores,
      riichi,
      riichiSticks,
    } = game;
    const honba = isSanma ? 200 : 300;
    const playerIxes = isSanma ? [0, 1, 2] : [0, 1, 2, 3];
    const roundCap = isSanma ? 3 : 4;
    const isOya = locState.seatWind === "1";

    const scores_ = scores.slice(0);
    scores_[locState.winner] += calcPoints.points.total;
    if (locState.scoreRiichiSticks && riichiSticks) {
      scores_[locState.winner] += 1000 * riichiSticks;
    }
    if (locState.scoreRepeatSticks) {
      scores_[locState.winner] += repeats * honba;
    }

    // This is technically exhaustive, TS just can't recognize the two values are the same.
    if (locState.agari === "ron" && calcPoints.agari === "ron") {
      if (locState.pao == null) {
        const deltas = isOya ? calcPoints.points.oya : calcPoints.points.ko;
        scores_[locState.dealtInPlayer] -= deltas.ron;
        if (locState.scoreRepeatSticks) {
          scores_[locState.dealtInPlayer] -= repeats * honba;
        }
      } else {
        const delta = ceil100(calcPoints.points.total / 2);
        scores_[locState.dealtInPlayer] -= delta;
        scores_[locState.pao] -= delta;
        if (locState.scoreRepeatSticks) {
          scores_[locState.dealtInPlayer] -= repeats * honba;
        }
      }
    } else if (locState.agari === "tsumo" && calcPoints.agari === "tsumo") {
      if (locState.pao == null) {
        for (const loser of playerIxes.filter((i) => i !== locState.winner)) {
          const delta = isOya
            ? calcPoints.points.oya.ko
            : nextWind(bottomWind, loser, isSanma) === "1"
              ? calcPoints.points.ko.oya
              : calcPoints.points.ko.ko;
          scores_[loser] -= delta;
          if (locState.scoreRepeatSticks) {
            scores_[loser] -= repeats * 100;
          }
        }
      } else {
        const delta = calcPoints.points.total;
        scores_[locState.pao] -= delta;
        if (locState.scoreRepeatSticks) {
          scores_[locState.pao] -= repeats * honba;
        }
      }
    }

    const shouldRotate = locState.handleRotation;
    const shouldRepeat = locState.seatWind === "1" && locState.dealerRepeat;
    const wonStats = changePlayerStat(game, locState.winner, "wins", 1);
    const playerStats = locState.agari === "ron"
      ? changePlayerStat({ ...game, playerStats: wonStats }, locState.dealtInPlayer, "dealIns", 1)
      : wonStats;
    await db.setGame(locState.id, {
      ...game,
      ...settledHand(game),
      playerStats,
      handResults: recordHand(game, scores_, {
        kind: locState.agari,
        handNumber: (game.handSequence ?? 0) + 1,
        winner: locState.winner,
        dealtIn: locState.agari === "ron" ? locState.dealtInPlayer : undefined,
        han, fu,
      }),
      ...(shouldRotate || shouldRepeat
        ? {
            bottomWind: shouldRepeat
              ? bottomWind
              : nextWind(bottomWind, -1, isSanma),
            roundWind: shouldRepeat
              ? roundWind
              : round === roundCap
                ? nextWind(roundWind, 1, isSanma)
                : roundWind,
            round: shouldRepeat ? round : round === roundCap ? 1 : round + 1,
            repeats: shouldRepeat ? repeats + 1 : 0,
          }
        : {}),
      scores: scores_,
      riichiSticks: locState.scoreRiichiSticks ? 0 : riichiSticks,
      riichi: locState.scoreRiichiSticks
        ? replicate(false, isSanma ? 3 : 4)
        : riichi,
    });

    const state: CompassState = {
      t: "load",
      id: locState.id,
      oldScores: scores,
    };
    void navigate("/compass", { state, replace: true });
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-20">
      <div className="fixed top-2 left-2 lg:top-4 lg:left-4">
        <CircleButton onClick={() => {
          if (locState.t === "transfer") {
            const state: CompassState = { t: "load", id: locState.id };
            void navigate("/compass", { state, replace: true });
          } else {
            void navigate("/", { replace: true });
          }
        }}>
          <HiArrowLeft />
        </CircleButton>
      </div>
      <h1 className="text-3xl lg:text-4xl">{u("和牌结算")}</h1>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xl">{t("calc.seat")}</span>
        <WindSelect forced value={seatWind} redEast sanma={isSanma} />
        <span className="text-2xl">{t(agari === "ron" ? "common.ron" : "common.tsumo")}</span>
      </div>
      <HanFu han={han} fu={fu} agari={agari} onHanChange={setHan} onFuChange={setFu} />
      <PointsResult
        result={{
          ...hanFuScores, noYaku: false, isOya: seatWind === "1",
          yakuman: 0, yaku: [], han, fu, pattern: null, name: null,
        }}
        pao={locState.t === "transfer" && locState.pao != null}
      />
      {locState.t === "transfer" && (
        <Button onClick={() => void transferScores(hanFuScores)}>
          {t("calc.transferPoints")}
        </Button>
      )}
    </div>
  );
}
