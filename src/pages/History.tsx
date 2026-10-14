import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import MatchResult from "../components/compass/MatchResult";
import useUiText from "../hooks/useUiText";
import { formatPt } from "../lib/pt";
import { useDb } from "../providers/DbProvider";

export default function History() {
  const u = useUiText();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const allRecords = useDb().useHistory();
  const [selectedOwner, setSelectedOwner] = useState("");
  const owners = [...new Map(allRecords?.map(record => [record.ownerId, record.game.players?.[record.playerIndex].displayName ?? record.ownerId])).entries()].sort(([a], [b]) => a.localeCompare(b));
  const ownerId = owners.some(([id]) => id === selectedOwner) ? selectedOwner : owners[0]?.[0];
  const records = allRecords?.filter(record => record.ownerId === ownerId);
  return <main className="min-h-dvh bg-slate-200 p-4 text-black dark:bg-gray-900 dark:text-white">
    <div className="mx-auto max-w-4xl">
      <h1 className="my-4 text-3xl font-semibold">{u("历史对局")}</h1>
      {!!owners.length && <label className="mb-4 block">{u("查看玩家")}<select aria-label={u("查看玩家")} value={ownerId} onChange={event => setSelectedOwner(event.target.value)} className="ml-3 rounded-lg border border-slate-500 bg-white p-2 dark:bg-gray-700">{owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
      <div className="grid grid-cols-[3rem_5rem_1fr] gap-3 border-b border-slate-500 py-3 font-semibold sm:grid-cols-[5rem_7rem_1fr]">
        <span>{u("顺位")}</span><span>{u("点数")}</span><span>{u("对局时间")}</span>
      </div>
      {records?.map(record => <button key={record.id} onClick={() => void navigate(`/history/${encodeURIComponent(record.id)}`)} className="grid w-full grid-cols-[3rem_5rem_1fr] items-center gap-3 border-b border-slate-500 py-4 text-left hover:bg-slate-300 dark:hover:bg-gray-800 sm:grid-cols-[5rem_7rem_1fr]" aria-label={u("查看对局详情 {{time}}", {time: record.endedAt})}>
        <span className="text-lg">{record.tied ? u("并列") : ""}{record.rank}</span>
        <span className="text-lg tabular-nums">{record.points}</span>
        <span className="min-w-0 text-sm sm:text-base">{new Date(record.endedAt).toLocaleString(i18n.language === "en" ? "en-GB" : "zh-CN")}<span className="mt-1 block text-slate-600 dark:text-slate-300">{record.game.players?.[record.playerIndex].displayName} · {formatPt(record.totalPt)} pt</span></span>
      </button>)}
      {records == null ? <p className="py-6">{u("正在加载")}</p> : !records.length && <p className="py-6">{u("暂无历史对局")}</p>}
      <div className="mt-6"><Button onClick={() => void navigate("/")}>{u("返回开始界面")}</Button></div>
    </div>
  </main>;
}

export function HistoryDetail() {
  const u = useUiText();
  const navigate = useNavigate();
  const { id } = useParams();
  const records = useDb().useHistory();
  const record = records?.find(entry => entry.id === id);
  if (!record) return <main className="min-h-dvh bg-slate-200 p-4 text-black dark:bg-gray-900 dark:text-white"><p className="my-4">{u(records == null ? "正在加载" : "对局不存在")}</p><Button onClick={() => void navigate("/history")}>{u("返回历史列表")}</Button></main>;
  return <div className="bg-slate-200 dark:bg-gray-900">
    <div className="p-4"><Button onClick={() => void navigate("/history")}>{u("返回历史列表")}</Button></div>
    <MatchResult game={record.game} gameId={record.id} readOnly onHome={() => void navigate("/")} />
  </div>;
}
