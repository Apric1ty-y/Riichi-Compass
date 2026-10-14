import { useTranslation } from "react-i18next";

// New UI labels use Chinese source text as keys; persisted match data stays language-neutral.
export default function useUiText() {
  const { t } = useTranslation("ui");
  return (text: string, values?: Record<string, string | number>) => t(text, { keySeparator: false, defaultValue: text, ...values });
}
