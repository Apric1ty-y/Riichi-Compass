import { useState } from "react";
import { type Game } from "../../data/interfaces";
import useUiText from "../../hooks/useUiText";
import { useDb } from "../../providers/DbProvider";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";

export default function SaveHistoryDialog({ gameId, onStay, onDone }: { game: Game; gameId: string; onStay: () => void; onDone: () => void }) {
  const u = useUiText();
  const db = useDb();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const resolve = async (save: boolean) => {
    setBusy(true); setError(false);
    try {
      if (save) await db.archiveGame(gameId);
      else await db.discardFinishedGame(gameId);
      onDone();
    } catch { setBusy(false); setError(true); }
  };
  return <CustomDialog title={u("保存历史对局")} onClose={() => { if (!busy) onStay(); }}>
    <div className="flex max-w-sm flex-col gap-4 text-lg">
      <p>{u("对局已结束，是否保存到所有参与者的历史对局？")}</p>
      <Button disabled={busy} onClick={() => void resolve(true)}>{u("保存并返回主页")}</Button>
      <Button disabled={busy} onClick={() => void resolve(false)}>{u("不保存并结束")}</Button>
      <Button disabled={busy} onClick={onStay}>{u("返回查看")}</Button>
      {error && <p role="alert" className="text-red-500">{u("保存失败，请重试。")}</p>}
    </div>
  </CustomDialog>;
}
