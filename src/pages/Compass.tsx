import clsx from "clsx";
import { type CSSProperties, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { HiArrowLeft, HiArrowUp, HiCog } from "react-icons/hi";
import { useLocation, useNavigate } from "react-router-dom";

import TileButton from "../components/calculator/TileButton";
import CircleButton from "../components/CircleButton";
import { AdvancedDialog } from "../components/compass/AdvancedDialog";
import { DrawDialog } from "../components/compass/DrawDialog";
import ScoreDisplay from "../components/compass/ScoreDisplay";
import { ScoreDifferenceContext } from "../components/compass/ScoreDifferenceContext";
import { ScoreUpdateDialog } from "../components/compass/ScoreUpdateDialog";
import { WinnerDialog } from "../components/compass/WinnerDialog";
import MatchResult from "../components/compass/MatchResult";
import CustomDialog from "../components/layout/CustomDialog";
import Button from "../components/Button";
import BlocksShuffleThree from "../components/loading/react-svg-spinners/BlocksShuffleThree";
import { type Game } from "../data/interfaces";
import useLocalStorage from "../hooks/useLocalStorage";
import useUiText from "../hooks/useUiText";
import { getWindNameTranslated, nextWind } from "../lib/hand";
import { changePlayerStat } from "../lib/match";
import { type CompassState } from "../lib/states";
import { useDb } from "../providers/DbProvider";

export default function Compass() {
  const { t } = useTranslation();
  const db = useDb();
  const navigate = useNavigate();
  const location = useLocation();

  const locState: CompassState = (location.state as CompassState | null) ?? {
    t: "load",
    id: "$tools",
  };
  const game = db.useGame(locState.id);

  useEffect(() => {
    if (game == null) {
      return;
    }
    if (!game.ok) {
      void navigate("/", { replace: true });
    }
  }, [game, navigate]);

  return (
    <div className="h-dvh w-screen bg-slate-200 text-black dark:bg-gray-900 dark:text-white">
      {game == null ? (
        <div className="flex h-dvh w-screen flex-col items-center justify-center">
          <div className="h-24 w-24 fill-black dark:fill-white">
            <BlocksShuffleThree />
          </div>
        </div>
      ) : game.ok ? (
        <CompassWithGame locState={locState} game={game.value} />
      ) : (
        <div className="flex h-dvh w-screen flex-col items-center justify-center">
          <div className="font-mono">
            {t(
              "compass.gameIdDoesNotExist",
              "Error: Game {{id}} does not exist.",
              { id: locState.id },
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompassWithGame({
  locState,
  game,
}: {
  locState: CompassState;
  game: Game;
}) {
  const { t } = useTranslation();
  const u = useUiText();
  const db = useDb();
  const navigate = useNavigate();

  const [useFourWayCompass] = useLocalStorage("useFourWayCompass");
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth - 12,
    height: (window.visualViewport?.height ?? window.innerHeight) - 12,
  });
  useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [useFourWayCompass]);
  // Full-length riichi buttons need enough corner clearance on near-square screens.
  const panelGroupThickness = window.innerWidth >= 1024 ? 260 : 176;
  const cornerClearance = Math.max(viewportSize.width, viewportSize.height) - 0.8 * Math.min(viewportSize.width, viewportSize.height);
  const scale = Math.min(1, viewportSize.width / 600, viewportSize.height / 600, cornerClearance / (2 * panelGroupThickness + 12));
  const stageStyle = {
    width: viewportSize.width / scale,
    height: viewportSize.height / scale,
    transform: `scale(${scale})`,
    "--stage-width": `${viewportSize.width / scale}px`,
    "--stage-height": `${viewportSize.height / scale}px`,
  } as CSSProperties;

  const { roundWind, round, repeats, scores, riichi, riichiSticks, settings } =
    game;

  const [oldScores, setOldScores] = useState<number[] | undefined>(
    locState.oldScores,
  );
  const [scoreUpdater, setScoreUpdater] = useState<number | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [openDrawDialog, setOpenDrawDialog] = useState(false);
  const [openAdvancedDialog, setOpenAdvancedDialog] = useState(false);
  const [manualEnd, setManualEnd] = useState(false);
  const [referenceIndex, setReferenceIndex] = useState<number | null>(null);
  useEffect(() => {
    const clear = () => setReferenceIndex(null);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const toggleRiichiStick = async (ix: number) => {
    setOldScores(scores.slice());
    if (riichi[ix]) {
      const scores_ = scores.slice();
      scores_[ix] = scores[ix] + 1000;
      const riichi_ = riichi.slice();
      riichi_[ix] = false;
      await db.setGame(locState.id, {
        ...game,
        scores: scores_,
        riichiSticks: riichiSticks - 1,
        playerStats: changePlayerStat(game, ix, "riichi", -1),
        riichi: riichi_,
      });
    } else {
      const scores_ = scores.slice();
      scores_[ix] = scores[ix] - 1000;
      const riichi_ = riichi.slice();
      riichi_[ix] = true;
      await db.setGame(locState.id, {
        ...game,
        scores: scores_,
        riichiSticks: riichiSticks + 1,
        playerStats: changePlayerStat(game, ix, "riichi", 1),
        riichi: riichi_,
      });
    }
  };

  const dismissEnd = async () => {
    setManualEnd(false);
    await db.setGame(locState.id, { ...game, pendingEndReason: undefined });
  };
  const finishGame = async () => {
    await db.setGame(locState.id, { ...game, pendingEndReason: undefined, endedAt: new Date().toISOString() });
    setManualEnd(false);
  };
  const requestEnd = () => {
    setOpenAdvancedDialog(false);
    setManualEnd(true);
  };
  if (game.endedAt) {
    return <MatchResult game={game} gameId={locState.id} onHome={() => void navigate("/", { replace: true })} />;
  }

  return (
    <ScoreDifferenceContext.Provider value={{ referenceIndex, setReferenceIndex }}>
      {(manualEnd || game.pendingEndReason) && scoreUpdater == null && winner == null && !openDrawDialog && !openAdvancedDialog && (
        <CustomDialog title={u("结束对局")} onClose={() => void dismissEnd()}>
          <div className="flex max-w-lg flex-col gap-4 text-xl">
            <p>{u(game.pendingEndReason ?? "是否结束当前对局并查看结果？")}</p>
            <p className="text-base">{u("结束后将锁定当前点数并显示对局结果。")}</p>
            <Button onClick={() => void finishGame()}>{u("结束并查看结果")}</Button>
            <Button onClick={() => void dismissEnd()}>{u("继续对局")}</Button>
          </div>
        </CustomDialog>
      )}
      {useFourWayCompass !== "false" ? (
    <div ref={viewportRef} className="legacy-compass-viewport">
    <div className="legacy-compass-stage relative" style={stageStyle}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <div className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))]">
          <ScoreDisplayInCompass
            ix={0}
            oldScores={oldScores}
            game={game}
            onScoreClick={() => setScoreUpdater(0)}
            onTileClick={() => setWinner(0)}
            onRiichiClick={() => void toggleRiichiStick(0)}
          />
        </div>
      </div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2">
        <div className="h-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))] w-fit rotate-180">
          <ScoreDisplayInCompass
            vertical
            ix={1}
            oldScores={oldScores}
            game={game}
            onScoreClick={() => setScoreUpdater(1)}
            onTileClick={() => setWinner(1)}
            onRiichiClick={() => void toggleRiichiStick(1)}
          />
        </div>
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <div className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))] rotate-180">
          <ScoreDisplayInCompass
            ix={2}
            oldScores={oldScores}
            game={game}
            onScoreClick={() => setScoreUpdater(2)}
            onTileClick={() => setWinner(2)}
            onRiichiClick={() => void toggleRiichiStick(2)}
          />
        </div>
      </div>
      {settings.sanma == null && (
        <div className="absolute top-1/2 left-0 -translate-y-1/2">
          <div className="h-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))] w-fit">
            <ScoreDisplayInCompass
              vertical
              ix={3}
              oldScores={oldScores}
              game={game}
              onScoreClick={() => setScoreUpdater(3)}
              onTileClick={() => setWinner(3)}
              onRiichiClick={() => void toggleRiichiStick(3)}
            />
          </div>
        </div>
      )}
      {scoreUpdater != null && (
        <ScoreUpdateDialog
          gameId={locState.id}
          game={game}
          scoreUpdater={scoreUpdater}
          onScoreUpdate={(x) => setOldScores(x)}
          onClose={() => setScoreUpdater(null)}
        />
      )}
      {winner != null && (
        <WinnerDialog
          gameId={locState.id}
          game={game}
          winner={winner}
          onClose={() => setWinner(null)}
        />
      )}
      {openDrawDialog && (
        <DrawDialog
          gameId={locState.id}
          game={game}
          onScoreUpdate={(x) => setOldScores(x)}
          onClose={() => setOpenDrawDialog(false)}
        />
      )}
      {openAdvancedDialog && (
        <AdvancedDialog
          gameId={locState.id}
          game={game}
          onEndGame={requestEnd}
          onScoreUpdate={setOldScores}
          onClose={() => setOpenAdvancedDialog(false)}
        />
      )}
      <div
        data-1c1
        className={clsx(
          "legacy-compass-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-slate-300 shadow dark:bg-sky-900",
          "portrait:h-[min(min(calc(var(--stage-width)*0.7),calc(var(--stage-height)*0.7)),calc(var(--stage-height)-16rem))] portrait:p-1.5 portrait:lg:h-[min(min(calc(var(--stage-width)*0.7),calc(var(--stage-height)*0.7)),calc(var(--stage-height)-24rem))] portrait:lg:px-2 portrait:lg:py-2",
          "landscape:w-[min(min(calc(var(--stage-width)*0.7),calc(var(--stage-height)*0.7)),calc(var(--stage-width)-16rem))] landscape:p-1.5 landscape:lg:w-[min(min(calc(var(--stage-width)*0.7),calc(var(--stage-height)*0.7)),calc(var(--stage-width)-24rem))] landscape:lg:px-2 landscape:lg:py-2",
        )}
      >
        <div
          className={clsx(
            "flex items-center justify-between gap-4",
            "portrait:h-full portrait:flex-col",
            "landscape:w-full landscape:flex-row",
          )}
        >
          <div
            className={clsx(
              "portrait:mx-2 portrait:-my-2 portrait:rotate-90",
              "flex flex-col items-center justify-center",
            )}
          >
            <TileButton
              onClick={() => {
                setOpenDrawDialog(true);
              }}
              tile={`${roundWind}z`}
            />
          </div>
          <span
            className={clsx(
              "flex items-center justify-between gap-y-2 text-xl lg:text-4xl",
              "portrait:flex-col portrait:rotate-90",
              "landscape:flex-col",
            )}
          >
            <span>
              {getWindNameTranslated(roundWind)(t)} {round}
              <PointBalanceLight scores={scores} riichiSticks={riichiSticks} isSanma={settings.sanma != null} />
            </span>
            <span className="flex flex-row items-center justify-center gap-x-4">
              <span className="flex flex-row items-center justify-center gap-x-2">
                <span
                  className={clsx(
                    "rotate-90 text-slate-900 dark:text-slate-400",
                    "portrait:mr-0.5 portrait:lg:mr-2",
                    "landscape:mt-2 landscape:lg:mt-2",
                  )}
                >
                  ⠿
                </span>
                <span>{repeats}</span>
              </span>
              <span className="flex flex-row items-center justify-center gap-x-2">
                <span
                  className={clsx(
                    "text-red-500 dark:text-red-600",
                    "portrait:mr-0.5 portrait:lg:mr-2",
                  )}
                >
                  ●
                </span>
                <span>{riichiSticks}</span>
              </span>
            </span>
          </span>
          <div
            className={clsx(
              "flex gap-2",
              "portrait:flex-row-reverse",
              "landscape:flex-col",
            )}
          >
            <div className="portrait:hidden">
              <CircleButton
                onClick={() => {
                  void navigate("/", { replace: true });
                }}
              >
                <HiArrowLeft />
              </CircleButton>
            </div>
            <div className="landscape:hidden">
              <CircleButton
                onClick={() => {
                  void navigate("/", { replace: true });
                }}
              >
                <HiArrowUp />
              </CircleButton>
            </div>
            <CircleButton
              onClick={() => {
                setOpenAdvancedDialog(true);
              }}
            >
              <HiCog />
            </CircleButton>
          </div>
        </div>
      </div>
    </div>
    </div>
  ) : (
    <div className="flex flex-row justify-center">
      <div className="h-dvh w-full overflow-y-auto">
        <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-y-2 p-2">
          <div
            data-1c1
            className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))] rounded-xl bg-slate-300 p-1.5 shadow lg:px-2 lg:py-2 dark:bg-sky-900"
          >
            <div className="flex w-full flex-row items-center justify-between gap-4">
              <div className="flex flex-col items-center justify-center">
                <TileButton
                  onClick={() => {
                    setOpenDrawDialog(true);
                  }}
                  tile={`${roundWind}z`}
                />
              </div>
              <span className="flex flex-col items-center justify-between gap-y-2 text-xl lg:text-4xl">
                <span>
                  {getWindNameTranslated(roundWind)(t)} {round}
              <PointBalanceLight scores={scores} riichiSticks={riichiSticks} isSanma={settings.sanma != null} />
                </span>
                <span className="flex flex-row items-center justify-center gap-x-4">
                  <span className="flex flex-row items-center justify-center gap-x-2">
                    <span className="mt-2 rotate-90 text-slate-900 lg:mt-2 dark:text-slate-400">
                      ⠿
                    </span>
                    <span>{repeats}</span>
                  </span>
                  <span className="flex flex-row items-center justify-center gap-x-2">
                    <span className="text-red-500 dark:text-red-600">●</span>
                    <span>{riichiSticks}</span>
                  </span>
                </span>
              </span>
              <div className="flex flex-col gap-2">
                <CircleButton
                  onClick={() => {
                    void navigate("/", { replace: true });
                  }}
                >
                  <HiArrowLeft />
                </CircleButton>
                <CircleButton
                  onClick={() => {
                    setOpenAdvancedDialog(true);
                  }}
                >
                  <HiCog />
                </CircleButton>
              </div>
            </div>
          </div>
          <div className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))]">
            <ScoreDisplayInCompass
              ix={0}
              oldScores={oldScores}
              game={game}
              onScoreClick={() => setScoreUpdater(0)}
              onTileClick={() => setWinner(0)}
              onRiichiClick={() => void toggleRiichiStick(0)}
              playerLabel="P1"
            />
          </div>
          <div className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))]">
            <ScoreDisplayInCompass
              ix={1}
              oldScores={oldScores}
              game={game}
              onScoreClick={() => setScoreUpdater(1)}
              onTileClick={() => setWinner(1)}
              onRiichiClick={() => void toggleRiichiStick(1)}
              playerLabel="P2"
            />
          </div>
          <div className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))]">
            <ScoreDisplayInCompass
              ix={2}
              oldScores={oldScores}
              game={game}
              onScoreClick={() => setScoreUpdater(2)}
              onTileClick={() => setWinner(2)}
              onRiichiClick={() => void toggleRiichiStick(2)}
              playerLabel="P3"
            />
          </div>
          {settings.sanma == null && (
            <div className="h-fit w-[min(calc(var(--stage-height)*0.8),calc(var(--stage-width)*0.8))]">
              <ScoreDisplayInCompass
                ix={3}
                oldScores={oldScores}
                game={game}
                onScoreClick={() => setScoreUpdater(3)}
                onTileClick={() => setWinner(3)}
                onRiichiClick={() => void toggleRiichiStick(3)}
                playerLabel="P4"
              />
            </div>
          )}
        </div>
      </div>
      {scoreUpdater != null && (
        <ScoreUpdateDialog
          gameId={locState.id}
          game={game}
          scoreUpdater={scoreUpdater}
          onScoreUpdate={(x) => setOldScores(x)}
          onClose={() => setScoreUpdater(null)}
        />
      )}
      {winner != null && (
        <WinnerDialog
          gameId={locState.id}
          game={game}
          winner={winner}
          onClose={() => setWinner(null)}
        />
      )}
      {openDrawDialog && (
        <DrawDialog
          gameId={locState.id}
          game={game}
          onScoreUpdate={(x) => setOldScores(x)}
          onClose={() => setOpenDrawDialog(false)}
        />
      )}
      {openAdvancedDialog && (
        <AdvancedDialog
          gameId={locState.id}
          game={game}
          onEndGame={requestEnd}
          onScoreUpdate={setOldScores}
          onClose={() => setOpenAdvancedDialog(false)}
        />
      )}
    </div>
      )}
    </ScoreDifferenceContext.Provider>
  );
}

function PointBalanceLight({
  scores,
  riichiSticks,
  isSanma,
}: {
  scores: number[];
  riichiSticks: number;
  isSanma: boolean;
}) {
  const total = scores.reduce((sum, score) => sum + score, 0) + riichiSticks * 1000;
  const expectedTotal = isSanma ? 35000 * 3 : 25000 * 4;
  const balanced = total === expectedTotal;
  const u = useUiText();
  const message = u("点数校验{{status}}：玩家点数 + 供托 = {{total}} 点，应为 {{expected}} 点", {status:u(balanced ? "正常" : "异常"), total, expected:expectedTotal});
  return (
    <span
      role="img"
      aria-label={message}
      title={message}
      className={clsx(
        "ms-2 inline-block h-3 w-3 rounded-full align-middle ring-2 ring-black/20 lg:h-4 lg:w-4",
        balanced
          ? "bg-green-400 shadow-[0_0_8px_#4ade80]"
          : "bg-red-500 shadow-[0_0_8px_#ef4444]",
      )}
    />
  );
}

function ScoreDisplayInCompass({
  game,
  ix,
  oldScores,
  vertical = false,
  onScoreClick,
  onTileClick,
  onRiichiClick,
  playerLabel,
}: {
  game: Game;
  ix: number;
  oldScores?: number[];
  vertical?: boolean;
  onScoreClick?: () => void;
  onTileClick?: () => void;
  onRiichiClick?: () => void;
  playerLabel?: string;
}) {
  const { bottomWind, scores, riichi, settings } = game;
  const { referenceIndex, setReferenceIndex } = useContext(ScoreDifferenceContext);
  return (
    <ScoreDisplay
      vertical={vertical}
      score={scores[ix]}
      oldScore={oldScores?.[ix]}
      riichi={riichi[ix]}
      difference={referenceIndex == null || referenceIndex === ix ? null : scores[referenceIndex] - scores[ix]}
      onDifferenceStart={() => setReferenceIndex(ix)}
      onDifferenceEnd={() => setReferenceIndex(null)}
      seatWind={nextWind(bottomWind, ix, settings.sanma != null)}
      onScoreClick={onScoreClick}
      onTileClick={onTileClick}
      onRiichiClick={onRiichiClick}
      playerLabel={playerLabel}
    />
  );
}
