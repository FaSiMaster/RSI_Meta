import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './de.json'
import fr from './fr.json'
import it from './it.json'
import en from './en.json'

const savedLang = localStorage.getItem('rsi-lang') ?? 'de'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'de',
    interpolation: { escapeValue: false },
  })

export default i18n
