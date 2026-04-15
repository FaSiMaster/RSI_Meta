// Vordefinierte Strassenmerkmale für RSI-Szenen
// Kategorien und Auswahloptionen nach TBA-Praxis

export interface MerkmalDefinition {
  id: string
  label: string
  optionen: string[]
}

export interface MerkmalKategorie {
  titel: string
  merkmale: MerkmalDefinition[]
}

export const STRASSENMERKMALE_KATALOG: MerkmalKategorie[] = [
  {
    titel: 'Funktionalität',
    merkmale: [
      {
        id: 'strassenklassierung',
        label: 'Strassenklassierung',
        optionen: ['HVS Bund', 'HVS Kanton', 'Verbindungsstrasse', 'Sammelstrasse', 'Erschliessungsstrasse', 'Quartierstrasse'],
      },
      {
        id: 'funktion_strasse',
        label: 'Funktion der Strasse',
        optionen: ['verkehrsorientiert (Basisnetz)', 'verkehrsorientiert (Ergänzungsnetz)', 'siedlungsorientiert', 'Mischnutzung'],
      },
      {
        id: 'haupt_nebenstrasse',
        label: 'Haupt- oder Nebenstrasse',
        optionen: ['Hauptstrasse, vortrittsberichtigt', 'Nebenstrasse, vortrittsberichtigt', 'Nebenstrasse, nicht vortrittsberichtigt'],
      },
      {
        id: 'lage_io_ao',
        label: 'Lage IO/AO',
        optionen: ['innerorts', 'ausserorts', 'inner- und ausserorts'],
      },
      {
        id: 'ausnahmetransportroute',
        label: 'Ausnahmetransportroute',
        optionen: ['keine', 'Typ I', 'Typ II', 'Typ III'],
      },
      {
        id: 'verkehrslastklasse',
        label: 'Verkehrslastklasse',
        optionen: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
      },
      {
        id: 'laengsgefaelle',
        label: 'Längsgefälle im Perimeter',
        optionen: ['< 3 %', '3–6 %', '6–10 %', '> 10 %'],
      },
      {
        id: 'strassenbeleuchtung',
        label: 'Strassenbeleuchtung',
        optionen: ['ja', 'nein', 'teilweise'],
      },
      {
        id: 'lichtsignalanlage',
        label: 'Lichtsignalanlage (LSA)',
        optionen: ['ja', 'nein'],
      },
    ],
  },
]
