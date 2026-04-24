import { describe, it, expect } from 'vitest'
import { hashKursPasswort, istPasswortHash, pruefeKursPasswort } from './appData'

describe('istPasswortHash', () => {
  it('true fuer korrekt praefixierte Hashes', () => {
    expect(istPasswortHash('kp:abcdef0123456789')).toBe(true)
  })

  it('false fuer Klartext', () => {
    expect(istPasswortHash('meinPasswort')).toBe(false)
  })

  it('false fuer null/undefined/leer', () => {
    expect(istPasswortHash(null)).toBe(false)
    expect(istPasswortHash(undefined)).toBe(false)
    expect(istPasswortHash('')).toBe(false)
  })
})

describe('hashKursPasswort', () => {
  it('liefert 64-Hex + kp:-Prefix (SHA-256)', async () => {
    const h = await hashKursPasswort('test')
    expect(h).toMatch(/^kp:[0-9a-f]{64}$/)
  })

  it('ist deterministisch', async () => {
    const a = await hashKursPasswort('gleicher_string')
    const b = await hashKursPasswort('gleicher_string')
    expect(a).toBe(b)
  })

  it('unterschiedliche Inputs → unterschiedliche Hashes', async () => {
    const a = await hashKursPasswort('a')
    const b = await hashKursPasswort('b')
    expect(a).not.toBe(b)
  })
})

describe('pruefeKursPasswort', () => {
  it('true wenn gespeichertes Passwort leer/null (kein Passwort gesetzt)', async () => {
    expect(await pruefeKursPasswort('irgendwas', null)).toBe(true)
    expect(await pruefeKursPasswort('irgendwas', '')).toBe(true)
    expect(await pruefeKursPasswort('irgendwas', '  ')).toBe(true)
  })

  it('true bei Hash-Match', async () => {
    const hash = await hashKursPasswort('geheim')
    expect(await pruefeKursPasswort('geheim', hash)).toBe(true)
  })

  it('false bei Hash-Mismatch', async () => {
    const hash = await hashKursPasswort('geheim')
    expect(await pruefeKursPasswort('falsch', hash)).toBe(false)
  })

  it('Legacy-Klartext-Vergleich funktioniert (rueckwaertskompatibel)', async () => {
    expect(await pruefeKursPasswort('alt_klartext', 'alt_klartext')).toBe(true)
    expect(await pruefeKursPasswort('falsch', 'alt_klartext')).toBe(false)
  })
})
