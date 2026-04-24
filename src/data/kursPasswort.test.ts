// Unit-Tests fuer pruefeKursPasswort (v0.7.0, Server-Salt-Pfeffern).
// Seit dem Hard-Cutover ist kein Client-Hashing mehr drin — die Pruefung
// laeuft ausschliesslich ueber die Edge Function `kurs-auth`. Die Tests
// stubben `fetch` und verifizieren den Kontrakt.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pruefeKursPasswort, type Kurs } from './appData'

const VITE_SUPABASE_URL = 'http://localhost:9999'
const VITE_SUPABASE_ANON_KEY = 'test-anon-key'

function makeKurs(overrides: Partial<Kurs> = {}): Kurs {
  return {
    id: 'k-test',
    name: 'Test',
    datum: '2026-04-24',
    zugangscode: 'FK-RSI-UNIT',
    topicIds: [],
    isActive: true,
    createdAt: 0,
    gueltigVon: null,
    gueltigBis: null,
    hatPasswort: true,
    ...overrides,
  }
}

describe('pruefeKursPasswort', () => {
  const originalEnv = { ...import.meta.env }

  beforeEach(() => {
    import.meta.env.VITE_SUPABASE_URL = VITE_SUPABASE_URL
    import.meta.env.VITE_SUPABASE_ANON_KEY = VITE_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv)
    vi.restoreAllMocks()
  })

  it('true wenn Kurs null/undefined ist', async () => {
    expect(await pruefeKursPasswort('irgendwas', null)).toBe(true)
    expect(await pruefeKursPasswort('irgendwas', undefined)).toBe(true)
  })

  it('true wenn Kurs kein Passwort hat (hatPasswort=false)', async () => {
    const kurs = makeKurs({ hatPasswort: false })
    expect(await pruefeKursPasswort('egal', kurs)).toBe(true)
  })

  it('true wenn hatPasswort=undefined (neuer/ungespeicherter Kurs)', async () => {
    const kurs = makeKurs({ hatPasswort: undefined })
    expect(await pruefeKursPasswort('egal', kurs)).toBe(true)
  })

  it('true wenn Edge Function {ok: true} liefert', async () => {
    const calls: Array<[string, RequestInit]> = []
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      calls.push([url, init])
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const kurs = makeKurs({ hatPasswort: true, zugangscode: 'FK-RSI-UNIT' })
    expect(await pruefeKursPasswort('geheim', kurs)).toBe(true)

    expect(calls.length).toBe(1)
    expect(calls[0][0]).toBe(`${VITE_SUPABASE_URL}/functions/v1/kurs-auth`)
    const body = JSON.parse(calls[0][1].body as string)
    expect(body).toEqual({ zugangscode: 'FK-RSI-UNIT', passwort: 'geheim' })
  })

  it('false wenn Edge Function {ok: false} liefert', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 200 })))
    expect(await pruefeKursPasswort('falsch', makeKurs())).toBe(false)
  })

  it('false bei HTTP-Fehler (4xx/5xx)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    expect(await pruefeKursPasswort('x', makeKurs())).toBe(false)
  })

  it('false bei Netzwerk-Exception', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await pruefeKursPasswort('x', makeKurs())).toBe(false)
  })

  it('false wenn Supabase-Env fehlt (Dev-Fallback)', async () => {
    import.meta.env.VITE_SUPABASE_URL = ''
    import.meta.env.VITE_SUPABASE_ANON_KEY = ''
    const kurs = makeKurs({ hatPasswort: true })
    expect(await pruefeKursPasswort('x', kurs)).toBe(false)
  })
})
