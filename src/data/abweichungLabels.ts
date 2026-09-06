// abweichungLabels.ts – i18n-Mapping für die Abweichungs-Optionen (Review R-14)
// Die normativen Definitionen bleiben unverändert in scoringEngine.ts
// (ABWEICHUNG_KATEGORIEN, Sacred File). Dieses Mapping liefert der UI
// übersetzbare Keys mit echten Umlauten; die deutschen Texte in de.json
// entsprechen wortgleich der Sacred-Definition.

import type { RSIDimension } from '../types'

export interface AbweichungI18nOption {
  wert:            RSIDimension
  labelKey:        string
  beschreibungKey: string
}

export const ABWEICHUNG_I18N: AbweichungI18nOption[] = [
  { wert: 'klein',  labelKey: 'verfahren:abw_klein',  beschreibungKey: 'verfahren:abw_klein_sub'  },
  { wert: 'mittel', labelKey: 'verfahren:abw_mittel', beschreibungKey: 'verfahren:abw_mittel_sub' },
  { wert: 'gross',  labelKey: 'verfahren:abw_gross',  beschreibungKey: 'verfahren:abw_gross_sub'  },
]
