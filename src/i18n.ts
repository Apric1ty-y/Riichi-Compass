import i18n from "i18next";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

void i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem("language") === "en" ? "en" : "zh-CN",
    supportedLngs: ["zh-CN", "en"],
    fallbackLng: "zh-CN",
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});
