// Echte Inhalte werden separat definiert (FaSi TBA ZH)

import type { Topic } from '../types'

export const PLACEHOLDER_TOPICS: Topic[] = [
  {
    id: 'innerorts',
    name: 'Innerorts',
    scenes: [
      { id: 'kreuzung-hauptstrasse', name: 'Kreuzung Hauptstrasse', imageUrl: '', deficits: [] },
      { id: 'fussgaengerstreifen', name: 'Fussgängerstreifen', imageUrl: '', deficits: [] },
    ],
  },
  {
    id: 'ausserorts',
    name: 'Ausserorts',
    scenes: [
      { id: 'kantonsstrasse', name: 'Kantonsstrasse', imageUrl: '', deficits: [] },
      { id: 'kurvenbereich', name: 'Kurvenbereich', imageUrl: '', deficits: [] },
    ],
  },
  {
    id: 'autobahn',
    name: 'Autobahn',
    scenes: [
      { id: 'einfahrt', name: 'Einfahrt / Auffahrt', imageUrl: '', deficits: [] },
      { id: 'tunnel', name: 'Tunnel', imageUrl: '', deficits: [] },
    ],
  },
]
