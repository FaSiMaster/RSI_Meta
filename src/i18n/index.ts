import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de";
import fr from "./locales/fr";
import en from "./locales/en";
import it from "./locales/it";

export type SupportedLang = "de" | "fr" | "en" | "it";

export const SUPPORTED_LANGS: { code: SupportedLang; label: string; flag: string }[] = [
  { code: "de", label: "DE", flag: "🇩🇪" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "it", label: "IT", flag: "🇮🇹" },
];

const STORAGE_KEY = "rsi-lang";

function detectLang(): SupportedLang {
  const stored = localStorage.getItem(STORAGE_KEY) as SupportedLang | null;
  if (stored && ["de", "fr", "en", "it"].includes(stored)) return stored;
  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (browser === "fr") return "fr";
  if (browser === "en") return "en";
  if (browser === "it") return "it";
  return "de"; // Default: Deutsch
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      en: { translation: en },
      it: { translation: it },
    },
    lng: detectLang(),
    fallbackLng: "de",
    interpolation: {
      escapeValue: false, // React escapet bereits
    },
  });

export function setLang(lang: SupportedLang) {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
