import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './de.json'
import fr from './fr.json'
import it from './it.json'
import en from './en.json'
import { VERFAHREN_BFU } from './verfahren.bfu'
import { VERFAHREN_UKO } from './verfahren.uko'

const savedLang = localStorage.getItem('rsi-lang') ?? 'de'

i18n
  .use(initReactI18next)
  .init({
    // Drei Namensräume: `translation` trägt Oberfläche und Bedienung,
    // `verfahren` die Bezeichnungen des Schweizer Neunschrittpfades,
    // `verfahrenUko` die der Konvention der Unfallkommission. Getrennt, weil
    // jedes Land sein Verfahren mitbringt, aber dieselbe Bedienung behält.
    // Im Code: t('verfahren:step1Title') bzw. t('verfahrenUko:schritt1Titel').
    // Welcher Namensraum gilt, sagt namensraumFuer() in data/verfahren.ts.
    resources: {
      de: { translation: de, verfahren: VERFAHREN_BFU.de, verfahrenUko: VERFAHREN_UKO.de },
      fr: { translation: fr, verfahren: VERFAHREN_BFU.fr, verfahrenUko: VERFAHREN_UKO.fr },
      it: { translation: it, verfahren: VERFAHREN_BFU.it, verfahrenUko: VERFAHREN_UKO.it },
      en: { translation: en, verfahren: VERFAHREN_BFU.en, verfahrenUko: VERFAHREN_UKO.en },
    },
    ns: ['translation', 'verfahren', 'verfahrenUko'],
    defaultNS: 'translation',
    lng: savedLang,
    fallbackLng: 'de',
    interpolation: { escapeValue: false },
  })

export default i18n
