import { useState } from "react";
import { type Game } from "../../data/interfaces";
import { isScoreTurn, normalizeMatch } from "../../lib/match";
import Button from "../Button";
import HandResults from "./HandResults";
import PtResult from "./PtResult";
import useUiText from "../../hooks/useUiText";
import SaveHistoryDialog from "./SaveHistoryDialog";

const colors = ["#38bdf8", "#f59e0b", "#a78bfa", "#4ade80"];

export default function MatchResult({ game, gameId, onHome, readOnly = false }: { game: Game; gameId: string; onHome: () => void; readOnly?: boolean }) {
  const [prompt, setPrompt] = useState(false);
  const requestExit = () => {
    if (readOnly || game.historyDisposition) onHome();
    else setPrompt(true);
  };
  return <>
    <MatchResultContent game={game} gameId={gameId} onHome={requestExit} onComplete={requestExit} readOnly={readOnly} />
    {prompt && <SaveHistoryDialog game={game} gameId={gameId} onStay={() => setPrompt(false)} onDone={onHome} />}
  </>;
}

function MatchResultContent({ game, gameId, onHome, onComplete, readOnly }: { game: Game; gameId: string; onHome: () => void; onComplete: () => void; readOnly: boolean }) {
  const [page, setPage] = useState(0);
  const u = useUiText();
  const match = normalizeMatch(game);
  const players = match.players!;
  const history = match.scoreHistory!;
  const values = history.flatMap((point) => point.scores);
  const low = Math.floor((Math.min(...values) - 2000) / 5000) * 5000;
  const high = Math.ceil((Math.max(...values) + 2000) / 5000) * 5000;
  const x = (i: number) => 70 + i * 550 / Math.max(1, history.length - 1);
  const y = (score: number) => 280 - (score - low) * 250 / (high - low);
  if (page === 1) return <HandResults game={game} onBack={() => setPage(0)} onNext={() => setPage(2)} onHome={onHome} />;
  if (page === 2) return <PtResult game={game} gameId={gameId} onBack={() => setPage(1)} onHome={onHome} onComplete={readOnly ? undefined : onComplete} readOnly={readOnly} />;
  return (
    <main className="min-h-dvh overflow-auto bg-slate-200 p-4 text-black dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="my-4 text-3xl font-semibold">{u("对局结果")}</h1>
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_2fr]">
          <div>
            <table className="w-full text-left text-xl" aria-label={u("最终点数")}>
              <thead><tr><th className="p-2">{u("玩家")}</th><th className="p-2 text-right">{u("点数")}</th><th className="p-2 text-right whitespace-nowrap text-base">{u("立／和／铳")}</th></tr></thead>
              <tbody>{players.map((player, i) => (
                <tr key={player.playerId} className="border-t border-slate-500">
                  <td className="p-2"><span style={{ color: colors[i] }}>● </span>{player.displayName}</td>
                  <td className="p-2 text-right tabular-nums">{game.scores[i]}</td>
                  <td className="p-2 text-right whitespace-nowrap text-base tabular-nums" aria-label={u("立直 {{riichi}} 次，和牌 {{wins}} 次，放铳 {{dealIns}} 次", {...match.playerStats![i]})}>{match.playerStats![i].riichi}／{match.playerStats![i].wins}／{match.playerStats![i].dealIns}</td>
                </tr>
              ))}</tbody>
            </table>
            {game.riichiSticks > 0 && <p className="mt-3">{u("供托：{{points}} 点", {points:game.riichiSticks * 1000})}</p>}
          </div>
          <section className="min-w-0" aria-label={u("分数走势")}>
            <h2 className="text-2xl">{u("分数走势")}</h2>
            <svg viewBox="0 0 650 330" className="w-full" role="img" aria-label={u("各玩家从起始点数到最终点数的折线图")}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const value = low + (high - low) * i / 5;
                return <g key={i}><line x1="70" x2="620" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.2" /><text x="60" y={y(value) + 5} textAnchor="end" fill="currentColor" fontSize="14">{Math.round(value)}</text></g>;
              })}
              {players.map((player, index) => <g key={player.playerId}>
                <polyline fill="none" stroke={colors[index]} strokeWidth="3" points={history.map((point, i) => `${x(i)},${y(point.scores[index])}`).join(" ")} />
                {history.map((point, i) => isScoreTurn(history, i, index) && <circle key={i} cx={x(i)} cy={y(point.scores[index])} r="3" fill={colors[index]}><title>{player.displayName} · {point.label}：{point.scores[index]}</title></circle>)}
              </g>)}
              <text x="70" y="310" fill="currentColor" fontSize="16">{u("起始")}</text>
              <text x="620" y="310" textAnchor="end" fill="currentColor" fontSize="16">{u("结束 · {{count}} 次记录", {count:history.length-1})}</text>
            </svg>
            <div className="flex flex-wrap gap-4">{players.map((player, i) => <span key={player.playerId} style={{ color: colors[i] }}>● {player.displayName}</span>)}</div>
          </section>
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onHome}>{u("返回开始界面")}</Button><Button onClick={() => setPage(1)}>{u("下一页")}</Button></div>
      </div>
    </main>
  );
}
