import { type Game, type HandResult } from "../../data/interfaces";
import { allHandResults, normalizeMatch } from "../../lib/match";
import Button from "../Button";
import useUiText from "../../hooks/useUiText";

const kinds = { ron: "荣和", tsumo: "自摸", draw: "荒牌流局", abort: "途中流局", chombo: "罚符", unknown: "结算" };
const winds = { "1": "东", "2": "南", "3": "西", "4": "北" };

function playerRole(hand: HandResult, player: number) {
  if (hand.winner === player) return kinds[hand.kind];
  if (hand.dealtIn === player) return "放铳";
  if (hand.kind === "draw") return hand.tenpai?.includes(player) ? "听牌" : "未听";
  if (hand.violationPlayer === player) return "犯规";
  return "";
}

export default function HandResults({ game, onBack, onNext, onHome }: { game: Game; onBack: () => void; onNext: () => void; onHome: () => void }) {
  const u = useUiText();
  const players = normalizeMatch(game).players!;
  const results = allHandResults(game);
  return <main className="min-h-dvh overflow-auto bg-slate-200 p-4 text-black dark:bg-gray-900 dark:text-white">
    <div className="mx-auto max-w-3xl">
      <h1 className="my-4 text-3xl font-semibold">{u("每局结果")}</h1>
      <div className="flex flex-col gap-4">
        {results.map((hand, index) => <section key={`${hand.at}-${index}`} className="overflow-hidden rounded-xl border border-slate-500">
          <h2 className="bg-slate-300 p-3 text-center text-xl font-semibold dark:bg-sky-900">
            {hand.roundWind && hand.round ? u("{{wind}}{{round}}局　{{repeats}}本场", {wind:u(winds[hand.roundWind]), round:hand.round, repeats:hand.repeats ?? 0}) : u("第{{number}}局（旧记录）", {number:hand.handNumber ?? index + 1})}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-500 px-3 py-2">
            <span className="text-lg font-semibold">{u(kinds[hand.kind])}</span>
            {hand.han != null && <span>{u("{{han}}番 {{fu}}符", {han:hand.han, fu:hand.fu ?? 0})}</span>}
          </div>
          <table className="w-full table-fixed text-lg" aria-label={u("第{{number}}条结算", {number:index+1})}>
            <tbody>{players.map((player, i) => (hand.kind !== "ron" || i === hand.winner || i === hand.dealtIn) && <tr key={player.playerId} className="border-b border-slate-400/30 last:border-0">
              <td className="w-1/4 p-2 text-base font-semibold text-slate-600 dark:text-slate-300">{u(playerRole(hand, i))}</td>
              <td className="p-2 break-words">{player.displayName}{hand.riichiPlayers?.includes(i) && <span className="ml-2 text-sm text-amber-600 dark:text-amber-400">{u("立直")}</span>}</td>
              <td className={`w-1/4 p-2 text-right font-semibold tabular-nums ${hand.deltas[i] > 0 ? "text-blue-600 dark:text-sky-400" : hand.deltas[i] < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                {hand.deltas[i] > 0 ? "+" : ""}{hand.deltas[i]}
              </td>
            </tr>)}</tbody>
          </table>
        </section>)}
        {!results.length && <p className="py-6 text-center text-xl">{u("暂无结算记录")}</p>}
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onBack}>{u("上一页")}</Button><Button onClick={onNext}>{u("下一页")}</Button><Button onClick={onHome}>{u("返回开始界面")}</Button></div>
    </div>
  </main>;
}
