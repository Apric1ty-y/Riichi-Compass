import { useState } from "react";
import { type Game } from "../../data/interfaces";
import useUiText from "../../hooks/useUiText";
import { useDb } from "../../providers/DbProvider";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";

export default function UndoButton({ gameId, game, onUndo }: { gameId: string; game: Game; onUndo: () => void }) {
  const db = useDb();
  const u = useUiText();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <>
    <Button disabled={!game.undoAvailable} onClick={() => setOpen(true)}>{u("撤销上一次操作")}</Button>
    {open && <CustomDialog title={u("撤销上一次操作")} onClose={() => { if (!busy) setOpen(false); }}>
      <div className="flex max-w-sm flex-col gap-4 text-lg">
        <p>{u("恢复上一步的点数、局数、本场、供托和统计记录？")}</p>
        <Button disabled={busy} onClick={() => {
          setBusy(true); setError(false);
          void db.undoGame(gameId).then(() => { setOpen(false); onUndo(); }).catch(() => { setBusy(false); setError(true); });
        }}>{u("确认撤销")}</Button>
        <Button disabled={busy} onClick={() => setOpen(false)}>{u("取消")}</Button>
        {error && <p role="alert">{u("撤销失败，请重试。")}</p>}
      </div>
    </CustomDialog>}
  </>;
}
