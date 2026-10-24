import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type Wind } from "../../lib/hand";
import TileButton from "../calculator/TileButton";
import H from "../text/H";
import useUiText from "../../hooks/useUiText";

const hundredsToPoints = (value: number) => value * 100;
const identity = (value: number) => value;

export default function ScoreDisplay({
  score,
  oldScore = score,
  animationDuration = 1000,
  seatWind,
  difference = null,
  onDifferenceStart,
  onDifferenceEnd,
  vertical = false,
  riichi = false,
  onScoreClick,
  onTileClick,
  onRiichiClick,
  playerLabel,
}: {
  score: number;
  oldScore?: number;
  animationDuration?: number;
  seatWind: Wind;
  difference?: number | null;
  onDifferenceStart?: () => void;
  onDifferenceEnd?: () => void;
  vertical?: boolean;
  riichi?: boolean;
  onScoreClick?: () => void;
  onTileClick?: () => void;
  onRiichiClick?: () => void;
  playerLabel?: string;
}) {
  const { t } = useTranslation();
  const u = useUiText();
  const [animDone, setAnimDone] = useState(false);
  useEffect(() => {
    if (oldScore !== score) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimDone(false);
    }
  }, [score, oldScore]);
  return (
    <div
      className={clsx(
        vertical
          ? "flex h-full w-38 flex-row-reverse lg:w-51"
          : "flex h-38 w-full flex-col lg:h-51",
        "items-center justify-center gap-1",
      )}
    >
      <div className={clsx("relative flex shrink-0 items-center justify-center", vertical ? "h-full w-14" : "h-14 w-full")}>
        <button
          data-riichi-button
          onClick={onRiichiClick}
          className={clsx(
            "flex h-full w-full items-center justify-center rounded-xl border border-gray-800 text-center text-2xl font-semibold shadow lg:text-3xl",
            riichi
              ? "bg-amber-500 enabled:hover:bg-amber-600 dark:bg-amber-700 dark:enabled:hover:bg-amber-800"
              : "bg-gray-50 enabled:hover:bg-gray-200 dark:bg-gray-500 dark:enabled:hover:bg-gray-600",
          )}
        >
          <span className={clsx("inline-block shrink-0 whitespace-nowrap", vertical && "rotate-90")}>
            {t("compass.riichi")}
          </span>
        </button>
        {playerLabel && (
          <div className="absolute top-1 right-1 rounded bg-slate-300 p-0.5 shadow lg:p-1 dark:bg-sky-900">
            <H>{playerLabel}</H>
          </div>
        )}
      </div>
      <div
        data-score-panel
        className={clsx(
          vertical
            ? "flex h-full w-fit flex-col p-1.5 lg:px-4 lg:py-2"
            : "flex h-fit w-full flex-row p-1.5 lg:px-2 lg:py-4",
          "items-center justify-between rounded-xl bg-slate-300 shadow dark:bg-sky-900",
        )}
      >
        <div
          className={clsx(
            vertical ? "mx-2 -my-2 rotate-90" : "",
            "flex flex-col items-center justify-center",
          )}
        >
          <TileButton
            onClick={onTileClick}
            red={seatWind === "1"}
            tile={`${seatWind}z`}
          ></TileButton>
        </div>
        <button
          className={clsx(
            "flex items-center justify-center font-semibold leading-none",
            String(difference ?? score).length > 5 ? "text-4xl lg:text-6xl" : "text-[3.5rem] lg:text-[5rem]",
            vertical ? "h-60 w-20 lg:w-28" : "h-20 w-60 lg:h-28",
          )}
          disabled={difference != null}
          aria-label={u("修改点数")}
          data-score-display
          onClick={onScoreClick}
        >
          <span className={clsx("inline-block shrink-0 whitespace-nowrap", vertical && "rotate-90")}>
            {difference != null ? (
              <span className="text-yellow-400">{difference === 0 ? "000" : difference > 0 ? `+${difference}` : difference}</span>
            ) : animDone || oldScore === score ? (
              <H>{score}</H>
            ) : oldScore > score ? (
              <H.Red>
                <AnimatedIncrement
                  key={`${oldScore}:${score}`}
                  start={oldScore / 100}
                  end={score / 100}
                  map={hundredsToPoints}
                  duration={animationDuration}
                  onDone={() => setAnimDone(true)}
                />
              </H.Red>
            ) : (
              <H>
                <AnimatedIncrement
                  key={`${oldScore}:${score}`}
                  start={oldScore / 100}
                  end={score / 100}
                  map={hundredsToPoints}
                  duration={animationDuration}
                  onDone={() => setAnimDone(true)}
                />
              </H>
            )}
          </span>
        </button>
        <button
          className={clsx(
            "flex shrink-0 touch-none select-none items-center justify-center rounded-xl border border-gray-800 bg-gray-50 text-xl font-semibold shadow dark:bg-gray-500 lg:text-3xl",
            vertical ? "h-14 w-20 lg:h-20 lg:w-28" : "h-20 w-14 lg:h-28 lg:w-20",
          )}
          aria-label={u("按住查看点差")}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onDifferenceStart?.();
          }}
          onPointerUp={onDifferenceEnd}
          onPointerCancel={onDifferenceEnd}
          onLostPointerCapture={onDifferenceEnd}
          onBlur={onDifferenceEnd}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              onDifferenceStart?.();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") onDifferenceEnd?.();
          }}
        >
          <span className={clsx("inline-block shrink-0 whitespace-nowrap text-3xl lg:text-4xl", vertical && "rotate-90")}>±</span>
        </button>
      </div>
    </div>
  );
}

function AnimatedIncrement({
  start,
  end,
  map = identity,
  duration,
  onDone,
}: {
  start: number;
  end: number;
  map?: (n: number) => number;
  duration: number;
  onDone?: () => void;
}) {
  const [value, setValue] = useState(() => map(start));
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    let frame: number;
    let startTimestamp: number | undefined;
    const step = (timestamp: number) => {
      startTimestamp ??= timestamp;
      const progress = duration <= 0 ? 1 : Math.min((timestamp - startTimestamp) / duration, 1);
      setValue(map(progress === 1 ? end : Math.floor(progress * (end - start) + start)));
      if (progress < 1) frame = window.requestAnimationFrame(step);
      else onDoneRef.current?.();
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [start, end, duration, map]);
  return <span>{value}</span>;
}
