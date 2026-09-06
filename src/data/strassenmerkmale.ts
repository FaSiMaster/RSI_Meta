// Vordefinierte Strassenmerkmale für RSI-Szenen
//
// Die Merkmale sind kein Zusatz dieses Werkzeugs: Sie stehen in der
// Perimeterebene der RSI-Erfassung und beschreiben die Anlage, in der eine
// Szene liegt. Die Optionen führen deshalb die Werte, die dort vorkommen —
// in der Schreibweise des Werkzeugs, siehe daten/merkmale_lesen.py.
//
// Die Wertelisten sind nicht die vollständige Domäne der Erfassung, sondern
// die Werte, die in den ausgewerteten Inspektionen tatsächlich vorkommen.
// Frei ergänzte Optionen aus der Inspektionspraxis stehen weiterhin dabei,
// damit von Hand angelegte Szenen nichts verlieren.
//
// Wichtig beim Ergänzen: Ein Katalogmerkmal wird im Administrationsbereich
// als Auswahlfeld dargestellt. Ein Wert, der hier nicht steht, erscheint
// dort nicht und geht beim nächsten Speichern verloren.

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
        optionen: ['HLS Kanton', 'HVS Bund', 'HVS Kanton', 'RVS', 'Verbindungsstrasse', 'Sammelstrasse', 'Erschliessungsstrasse', 'Quartierstrasse'],
      },
      {
        id: 'funktion_strasse',
        label: 'Funktion der Strasse',
        optionen: ['verkehrsorientiert (Basisnetz)', 'verkehrsorientiert (Ergänzungsnetz)', 'siedlungsorientiert', 'Mischnutzung'],
      },
      {
        id: 'haupt_nebenstrasse',
        label: 'Haupt- oder Nebenstrasse',
        optionen: ['Hauptstrasse', 'Hauptstrasse, nummeriert', 'Hauptstrasse, vortrittsberichtigt', 'Verbindungsstrasse (RVS) als signalisierte Hauptstrasse', 'Nebenstrasse, vortrittsberichtigt', 'Nebenstrasse, nicht vortrittsberichtigt'],
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
        optionen: ['nein', 'ja, ganze Nacht', 'ja, teilweise', 'teilweise'],
      },
      {
        id: 'lichtsignalanlage',
        label: 'Lichtsignalanlage (LSA)',
        optionen: ['nein', 'ja', 'ja, 24 h Betrieb'],
      },
    ],
  },
  {
    titel: 'Verkehr',
    merkmale: [
      {
        id: 'signalisierte_geschwindigkeit',
        label: 'Signalisierte Geschwindigkeit',
        optionen: ['20 km/h', '30 km/h', '50 km/h', '60 km/h', '80 km/h', '> 100 km/h', 'mehrere Geschwindigkeiten'],
      },
      {
        id: 'dtv',
        label: 'Durchschnittlicher täglicher Verkehr (Fz/24 h)',
        optionen: [],
      },
      {
        id: 'begegnungsfall',
        label: 'Massgebender Begegnungsfall',
        optionen: ['LKW-LKW', 'LKW-PW', 'PW-PW'],
      },
      {
        id: 'verkehrsqualitaet',
        label: 'Verkehrsqualität (LOS)',
        optionen: ['LOS A', 'LOS B', 'LOS C', 'LOS D', 'LOS E', 'LOS F'],
      },
    ],
  },
  {
    titel: 'Verkehrsteilnehmende',
    merkmale: [
      {
        id: 'trottoir',
        label: 'Trottoir',
        optionen: ['beidseitig lückenlos', 'einseitig lückenlos', 'lückenhaft oder nicht vorhanden'],
      },
      {
        id: 'fussgaengerstreifen',
        label: 'Fussgängerstreifen',
        optionen: ['nein', 'ja, einer', 'ja, mehrere'],
      },
      {
        id: 'veloroute',
        label: 'Veloroute',
        optionen: ['ja', 'nein'],
      },
      {
        id: 'veloinfrastruktur',
        label: 'Veloinfrastruktur',
        optionen: ['Radstreifen', 'Radweg', 'Rad- und Fussweg', 'keine'],
      },
      {
        id: 'buslinie',
        label: 'Buslinie',
        optionen: ['nein', 'ja', 'ja, mehrere'],
      },
      {
        id: 'bushaltestellen',
        label: 'Bushaltestellen',
        optionen: ['nein', 'ja', 'ja, mehrere'],
      },
      {
        id: 'landwirtschaftsverkehr',
        label: 'Landwirtschaftsverkehr',
        optionen: ['keiner oder selten', 'regelmässig'],
      },
      {
        id: 'strassenbahn',
        label: 'Strassenbahn',
        optionen: ['nein', 'ja'],
      },
    ],
  },
]
