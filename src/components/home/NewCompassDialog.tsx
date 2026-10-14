import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import useLocalStorage from "../../hooks/useLocalStorage";
import { type Wind } from "../../lib/hand";
import { DefaultSettings } from "../../lib/settings";
import { loadPtSettings } from "../../lib/pt";
import { type CompassState } from "../../lib/states";
import { replicate } from "../../lib/util";
import { useDb } from "../../providers/DbProvider";
import Button from "../Button";
import WindSelect from "../calculator/WindSelect";
import CustomDialog from "../layout/CustomDialog";
import ToggleOnOff from "../ToggleOnOff";

export function NewCompassDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const db = useDb();

  const [newCompassInitialScore, setNewCompassInitialScore] = useState(25000);
  const [newCompassBottomWind, setNewCompassBottomWind] = useState<Wind>("1");
  const [newCompassSettings, setNewCompassSettings] = useState(DefaultSettings);
  const initialScoreInputRef = useRef<HTMLInputElement | null>(null);

  const [useFourWayCompass, setUseFourWayCompass] =
    useLocalStorage("useFourWayCompass");

  const submitNewCompass = async () => {
    await db.setGame("$tools", {
      // getRandomValues also works on the phone's plain-HTTP LAN address.
      sessionId: Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16).padStart(8, "0")).join("-"),
      bottomWind: newCompassBottomWind,
      startedAt: new Date().toISOString(),
      initialBottomWind: newCompassBottomWind,
      ptSettings: loadPtSettings(newCompassSettings.sanma ? 3 : 4),
      roundWind: "1",
      round: 1,
      repeats: 0,
      scores: replicate(
        newCompassInitialScore,
        newCompassSettings.sanma ? 3 : 4,
      ),
      riichiSticks: 0,
      riichi: replicate(false, newCompassSettings.sanma ? 3 : 4),
      settings: {
        ...newCompassSettings,
        kiriageMangan: localStorage.getItem("kiriageMangan") === "true",
      },
    });
    const state: CompassState = { t: "load", id: "$tools" };
    void navigate("/compass", { state, replace: true });
  };

  return (
    <CustomDialog
      initialFocus={initialScoreInputRef}
      onClose={onClose}
      title={t("home.newGame")}
    >
      <div className="flex flex-col items-center justify-center gap-y-8">
        <form
          className="flex flex-col items-center justify-center gap-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitNewCompass();
          }}
        >
          <p className="text-xl lg:text-2xl">{t("home.initialScore")}</p>
          <input
            ref={initialScoreInputRef}
            key="scoreInput"
            type="text"
            inputMode="numeric"
            className="h-10 w-52 rounded-xl bg-slate-300 p-1 text-center text-2xl font-bold text-amber-700 lg:h-14 lg:w-80 lg:text-4xl dark:bg-sky-900 dark:text-amber-500"
            value={newCompassInitialScore}
            onChange={(e) => {
              const n = Number(e.target.value.match(/^\d+/)?.[0] ?? 0);
              if (!isNaN(n)) {
                setNewCompassInitialScore(n);
              }
            }}
          />
          <p className="text-xl lg:text-2xl">{t("home.yourSeatWind")}</p>
          <div>
            <WindSelect
              value={newCompassBottomWind}
              redEast
              sanma={newCompassSettings.sanma != null}
              onChange={(w) => setNewCompassBottomWind(w)}
            />
          </div>
          <ToggleOnOff
            toggled={useFourWayCompass !== "false"}
            onToggle={() =>
              setUseFourWayCompass(
                useFourWayCompass === "false" ? "true" : "false",
              )
            }
          >
            {t("home.fourwayCompass")}
          </ToggleOnOff>
          <ToggleOnOff
            toggled={newCompassSettings.sanma != null}
            onToggle={(enabled) => {
              setNewCompassSettings({
                ...newCompassSettings,
                sanma: enabled ? "loss" : null,
              });
              setNewCompassInitialScore(enabled ? 35000 : 25000);
            }}
          >
            {t("settings.gameMode.threePlayer")}
          </ToggleOnOff>
        </form>
        <Button
          onClick={() => {
            void submitNewCompass();
          }}
        >
          {t("common.start")}
        </Button>
      </div>
    </CustomDialog>
  );
}
