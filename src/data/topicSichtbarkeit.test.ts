// Tests fuer die Kurs-Sichtbarkeit von Themen (v0.10.1, striktes Modell)

import { describe, it, expect } from 'vitest'
import { filterSichtbareTopics, type AppTopic, type Kurs } from './appData'

function topic(id: string, over: Partial<AppTopic> = {}): AppTopic {
  return {
    id,
    nameI18n: { de: id, fr: '', it: '', en: '' },
    beschreibungI18n: { de: '', fr: '', it: '', en: '' },
    sortOrder: 0,
    isActive: true,
    ...over,
  }
}

function kurs(topicIds: string[]): Kurs {
  return {
    id: 'k1', name: 'Testkurs', datum: '2026-07-29', zugangscode: 'FK-TEST',
    topicIds, isActive: true, createdAt: 0, gueltigVon: null, gueltigBis: null,
  } as Kurs
}

const FREI      = topic('frei')
const EXKLUSIV  = topic('spezial', { kursExklusiv: true })
const ARCHIVIERT = topic('alt', { isActive: false })
const ALLE = [FREI, EXKLUSIV, ARCHIVIERT]

describe('filterSichtbareTopics (striktes Modell)', () => {
  it('freies Training: nur aktive Themen ohne kursExklusiv', () => {
    expect(filterSichtbareTopics(ALLE, null).map(t => t.id)).toEqual(['frei'])
  })

  it('archivierte Themen erscheinen nie (isActive-Fix)', () => {
    expect(filterSichtbareTopics(ALLE, null).some(t => t.id === 'alt')).toBe(false)
    expect(filterSichtbareTopics(ALLE, kurs(['alt'])).map(t => t.id)).toEqual([])
  })

  it('mit Kurs: NUR die angehakten Themen (strikt), inkl. exklusiver', () => {
    expect(filterSichtbareTopics(ALLE, kurs(['spezial'])).map(t => t.id)).toEqual(['spezial'])
  })

  it('mit Kurs: freie Themen ohne Haekchen sind unsichtbar', () => {
    expect(filterSichtbareTopics(ALLE, kurs(['spezial'])).some(t => t.id === 'frei')).toBe(false)
  })

  it('Kurs ohne angehakte Themen: Fallback auf freie Auswahl (Backwards-Compat)', () => {
    expect(filterSichtbareTopics(ALLE, kurs([])).map(t => t.id)).toEqual(['frei'])
  })
})
