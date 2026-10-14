import clsx from "clsx";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { HiChip, HiQuestionMarkCircle } from "react-icons/hi";

import useLocalStorage from "../../hooks/useLocalStorage";
import { updateTheme } from "../../lib/util";
import { useDb } from "../../providers/DbProvider";
import Button from "../Button";
import CustomDialog from "../layout/CustomDialog";
import { HTrans } from "../text/Localized";

export default function PreferencesDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();

  const [theme, setTheme] = useLocalStorage("theme");
  const [kiriageMangan, setKiriageMangan] = useLocalStorage("kiriageMangan");
  const db = useDb();
  const changeKiriageMangan = async (enabled: boolean) => {
    setKiriageMangan(String(enabled));
    const game = await db.getGame("$tools");
    if (game.ok) {
      await db.setGame("$tools", {
        ...game.value,
        settings: { ...game.value.settings, kiriageMangan: enabled },
      });
    }
  };

  return (
    <CustomDialog title={t("home.preferences")} onClose={onClose}>
      <div className="flex flex-col items-center justify-center gap-y-8">
        <div className="flex flex-col items-center justify-center gap-y-2">
          <SettingRow name={t("settings.language.$")} help={<HTrans i18nKey="settings.language.help" />}>
            <Button active={i18n.language === "zh-CN"} onClick={() => { localStorage.setItem("language", "zh-CN"); void i18n.changeLanguage("zh-CN"); }}>中文</Button>
            <Button active={i18n.language === "en"} onClick={() => { localStorage.setItem("language", "en"); void i18n.changeLanguage("en"); }}>English</Button>
          </SettingRow>
          <SettingRow
            name={t("settings.theme.$")}
            help={
              <span>
                <HTrans i18nKey="settings.theme.help" />
              </span>
            }
          >
            <Button
              active={theme === "light"}
              onClick={() => {
                if (theme === "light") setTheme(null);
                else setTheme("light");
                updateTheme();
              }}
            >
              {t("common.light")}
            </Button>
            <Button
              active={theme === "dark"}
              onClick={() => {
                if (theme === "dark") setTheme(null);
                else setTheme("dark");
                updateTheme();
              }}
            >
              {t("common.dark")}
            </Button>
          </SettingRow>
          <SettingRow
            name={t("settings.roundedMangan.$")}
            help={<HTrans i18nKey="settings.roundedMangan.help" />}
            compass
            last
          >
            <Button active={kiriageMangan === "true"} onClick={() => void changeKiriageMangan(true)}>
              {i18n.language === "en" ? "On" : "开"}
            </Button>
            <Button active={kiriageMangan !== "true"} onClick={() => void changeKiriageMangan(false)}>
              {i18n.language === "en" ? "Off" : "关"}
            </Button>
          </SettingRow>
        </div>
        <div className="flex flex-col items-center justify-center gap-y-2">
          <Button
            onClick={() => {
              onClose();
            }}
          >
            {t("common.close")}
          </Button>
        </div>
      </div>
    </CustomDialog>
  );
}

function SettingRow({
  name,
  help,
  compass = false,
  last = false,
  children,
}: {
  name: string;
  help: ReactNode;
  compass?: boolean;
  last?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [helpOpened, setHelpOpened] = useState(false);
  return (
    <div
      className={clsx(
        "flex flex-row flex-wrap items-center justify-center gap-2 lg:flex-nowrap",
        !last && "border-b-2 border-dashed border-gray-800 pb-2",
      )}
    >
      <div className="flex w-60 flex-row items-center justify-between gap-2 lg:w-[20rem]">
        <span className="relative text-xl lg:text-2xl">
          {name}
          {compass && (
            <span
              className="absolute mx-1 h-4 w-4"
              title={t("settings.affectsTheCompass")}
            >
              <HiChip />
            </span>
          )}
        </span>
        <HelpButton
          highlight={helpOpened}
          onClick={() => setHelpOpened(!helpOpened)}
        />
      </div>
      <div className="flex w-56 flex-row flex-wrap items-start justify-center gap-2 md:w-108 lg:w-164">
        {children}
      </div>
      {helpOpened && (
        <CustomDialog title={name} onClose={() => setHelpOpened(false)}>
          <div className="text-lg lg:text-xl">{help}</div>
        </CustomDialog>
      )}
    </div>
  );
}

function HelpButton({
  highlight,
  onClick,
}: {
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={clsx(
        "rounded-full border border-gray-800 p-1 disabled:bg-gray-300 dark:disabled:bg-gray-800 dark:disabled:text-gray-600",
        highlight
          ? "bg-amber-500 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-800"
          : "bg-gray-50 hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600",
      )}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      <div className="flex h-6 w-6 flex-col items-center justify-center lg:h-8 lg:w-8">
        <HiQuestionMarkCircle className="text-2xl" />
      </div>
    </button>
  );
}
