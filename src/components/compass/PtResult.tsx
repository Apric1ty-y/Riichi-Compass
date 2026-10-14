import { useState } from "react";
import { type Game, type PtSettings } from "../../data/interfaces";
import { normalizeMatch } from "../../lib/match";
import { calculatePt, defaultPtSettings, formatPt, loadPtSettings, validPtSettings } from "../../lib/pt";
import { useDb } from "../../providers/DbProvider";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";
import useUiText from "../../hooks/useUiText";

function savedSettings(game: Game): PtSettings {
  const count = game.scores.length;
  if (validPtSettings(game.ptSettings, count)) return game.ptSettings;
  return loadPtSettings(count);
}

export default function PtResult({ game, gameId, onBack, onHome, onComplete, readOnly = false }: { game: Game; gameId: string; onBack: () => void; onHome: () => void; onComplete?: () => void; readOnly?: boolean }) {
  const db = useDb();
  const u = useUiText();
  const [settings, setSettings] = useState(() => savedSettings(game));
  const [open, setOpen] = useState(false);
  const players = normalizeMatch(game).players!;
  const result = calculatePt(game, settings);
  const save = async (value: PtSettings) => {
    await db.setGame(gameId, { ...game, ptSettings: value });
    localStorage.setItem(`pt-settings-${game.scores.length}`, JSON.stringify(value));
    setSettings(value);
    setOpen(false);
  };
  return <main className="min-h-dvh overflow-auto bg-slate-200 p-4 text-black dark:bg-gray-900 dark:text-white">
    <div className="mx-auto max-w-5xl">
      <div className="my-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">{u("PT 结算")}</h1>{!readOnly && <Button small onClick={() => setOpen(true)}>{u("设置")}</Button>}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-base sm:text-lg tabular-nums" aria-label={u("PT 结算")}>
          <thead><tr>{["顺位", "玩家", "素点", "马点", "丘点", "总 pt"].map(label => <th key={label} className="px-1 py-2 sm:px-2 whitespace-nowrap">{u(label)}</th>)}</tr></thead>
          <tbody>{result.map(row => <tr key={players[row.index].playerId} className="border-t border-slate-500">
            <td className="px-1 py-2 sm:px-2 whitespace-nowrap">{row.tied ? u("并列") : ""}{row.rank}</td><td className="px-1 py-2 sm:px-2 break-words">{players[row.index].displayName}</td>
            <td className="px-1 py-2 sm:px-2">{formatPt(row.raw)}</td><td className="px-1 py-2 sm:px-2">{formatPt(row.uma)}</td><td className="px-1 py-2 sm:px-2">{formatPt(row.oka)}</td>
            <td className={`px-1 py-2 sm:px-2 font-semibold ${row.total > 0 ? "text-blue-600 dark:text-sky-400" : row.total < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{formatPt(row.total)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {game.riichiSticks > 0 && <p className="mt-3">{u("供托 {{points}} 点：{{status}}", {points: game.riichiSticks * 1000, status: u(settings.awardSupply ? (settings.tieBreak === "seat" ? "计入头名素点" : "计入头名素点，同分均分") : "不分配")})}</p>}
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onBack}>{u("上一页")}</Button>{onComplete && <Button onClick={onComplete}>{u("完成")}</Button>}<Button onClick={onHome}>{u("返回开始界面")}</Button></div>
    </div>
    {open && <PtSettingsDialog value={settings} count={game.scores.length} onClose={() => setOpen(false)} onSave={save} />}
  </main>;
}

export function PtSettingsDialog({ value, count, onCountChange, onClose, onSave }: { value: PtSettings; count: number; onCountChange?: (count: number) => void; onClose: () => void; onSave: (value: PtSettings) => Promise<void> }) {
  const u = useUiText();
  const [draft, setDraft] = useState(value);
  const [start, setStart] = useState(String(value.startPoints));
  const [returnPoints, setReturnPoints] = useState(String(value.returnPoints));
  const [uma, setUma] = useState(value.uma.map(String));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputClass = "w-full rounded-lg border border-slate-500 bg-white p-2 text-lg dark:bg-gray-700";
  const reset = () => {
    const preset = defaultPtSettings(count);
    setDraft(preset); setStart(String(preset.startPoints)); setReturnPoints(String(preset.returnPoints)); setUma(preset.uma.map(String)); setError("");
  };
  const save = async () => {
    const updated = { ...draft, startPoints: Number(start), returnPoints: Number(returnPoints), uma: uma.map(Number) };
    if ([start, returnPoints, ...uma].some(text => !text.trim()) || !validPtSettings(updated, count)) { setError("请输入有效的返还点、起始点和各顺位马点。"); return; }
    setSaving(true);
    try { await onSave(updated); } catch { setError("保存失败，请重试。"); setSaving(false); }
  };
  return <CustomDialog title={u("PT 设置")} onClose={onClose}>
    <div className="flex w-[min(440px,calc(100vw-64px))] flex-col gap-4">
      {onCountChange && <label>{u("对局人数")}<select aria-label={u("对局人数")} className={inputClass} value={count} onChange={event => onCountChange(Number(event.target.value))}><option value="4">{u("四人麻将")}</option><option value="3">{u("三人麻将")}</option></select></label>}
      <Button onClick={reset}>{u(count === 4 ? "使用 M 联赛规则" : "恢复三麻默认")}</Button>
      <label>{u("起始点")}<input aria-label={u("起始点")} type="number" min="0" className={inputClass} value={start} onChange={event => setStart(event.target.value)} /></label>
      <label>{u("返还点")}<input aria-label={u("返还点")} type="number" min="0" className={inputClass} value={returnPoints} onChange={event => setReturnPoints(event.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">{uma.map((number, index) => <label key={index}>{u("第{{rank}}名马点", {rank:index + 1})}<input aria-label={u("第{{rank}}名马点", {rank:index + 1})} type="number" step="any" className={inputClass} value={number} onChange={event => setUma(uma.map((n, i) => i === index ? event.target.value : n))} /></label>)}</div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.oka} onChange={event => setDraft({ ...draft, oka: event.target.checked })} />{u("计入丘点（返还点与起始点之差 × 人数）")}</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.awardSupply} onChange={event => setDraft({ ...draft, awardSupply: event.target.checked })} />{u("剩余供托归头名")}</label>
      <label>{u("同分处理")}<select aria-label={u("同分处理")} className={inputClass} value={draft.tieBreak ?? "split"} onChange={event => setDraft({ ...draft, tieBreak: event.target.value as "split" | "seat" })}>
        <option value="split">{u("马点均分")}</option><option value="seat">{u("按开局座次排顺位（东→南→西→北）")}</option>
      </select></label>
      {count === 3 && <p>{u("三麻使用自定义规则，非 M 联赛官方规则。")}</p>}
      {error && <p role="alert" className="text-red-500">{u(error)}</p>}
      <Button disabled={saving} onClick={() => void save()}>{u("保存")}</Button>
    </div>
  </CustomDialog>;
}
