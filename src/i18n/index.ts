import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './de.json'
import fr from './fr.json'
import it from './it.json'
import en from './en.json'
import { VERFAHREN_BFU } from './verfahren.bfu'

const savedLang = localStorage.getItem('rsi-lang') ?? 'de'

i18n
  .use(initReactI18next)
  .init({
    // Zwei Namensräume: `translation` trägt Oberfläche und Bedienung,
    // `verfahren` die Bezeichnungen des Beurteilungsverfahrens. Getrennt,
    // weil ein zweites Land ein zweites Verfahren mitbringt, aber dieselbe
    // Bedienung behält. Im Code: t('verfahren:step1Title').
    resources: {
      de: { translation: de, verfahren: VERFAHREN_BFU.de },
      fr: { translation: fr, verfahren: VERFAHREN_BFU.fr },
      it: { translation: it, verfahren: VERFAHREN_BFU.it },
      en: { translation: en, verfahren: VERFAHREN_BFU.en },
    },
    ns: ['translation', 'verfahren'],
    defaultNS: 'translation',
    lng: savedLang,
    fallbackLng: 'de',
    interpolation: { escapeValue: false },
  })

export default i18n
