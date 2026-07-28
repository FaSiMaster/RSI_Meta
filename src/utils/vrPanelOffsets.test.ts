// Tests für die VR-Panel-Offset-Persistenz (v0.9.0 — Panels verschiebbar)
import { describe, it, expect, beforeEach } from 'vitest'
import {
  clampOffset,
  loadVRPanelOffsets,
  getVRPanelOffset,
  saveVRPanelOffset,
  clearVRPanelOffset,
  OFFSET_GRENZEN,
  type PanelOffset,
} from './vrPanelOffsets'

const STORAGE_KEY = 'rsi-v3-vr-panel-offsets'

beforeEach(() => {
  localStorage.clear()
})

describe('clampOffset', () => {
  it('lässt Werte innerhalb der Grenzen unverändert', () => {
    const o: PanelOffset = [0.5, -0.3, -1.5]
    expect(clampOffset(o)).toEqual([0.5, -0.3, -1.5])
  })

  it('begrenzt X und Y auf die Grenzen', () => {
    expect(clampOffset([9, -9, -1.5])).toEqual([OFFSET_GRENZEN.x, -OFFSET_GRENZEN.y, -1.5])
  })

  it('hält Z im Bereich vor dem User', () => {
    expect(clampOffset([0, 0, 2])[2]).toBe(OFFSET_GRENZEN.zMax)
    expect(clampOffset([0, 0, -99])[2]).toBe(OFFSET_GRENZEN.zMin)
  })
})

describe('save / get / clear Roundtrip', () => {
  it('speichert und lädt einen Offset', () => {
    saveVRPanelOffset('bewertung', [0.4, 0.2, -1.5])
    expect(getVRPanelOffset('bewertung')).toEqual([0.4, 0.2, -1.5])
  })

  it('liefert null für unbekannte IDs', () => {
    expect(getVRPanelOffset('gibt-es-nicht')).toBeNull()
  })

  it('clampt beim Speichern', () => {
    saveVRPanelOffset('progress', [99, 99, 99])
    expect(getVRPanelOffset('progress')).toEqual([
      OFFSET_GRENZEN.x,
      OFFSET_GRENZEN.y,
      OFFSET_GRENZEN.zMax,
    ])
  })

  it('hält mehrere Panels unabhängig auseinander', () => {
    saveVRPanelOffset('progress', [0.1, 0.2, -1.0])
    saveVRPanelOffset('controls', [-0.1, -0.2, -2.0])
    expect(getVRPanelOffset('progress')).toEqual([0.1, 0.2, -1.0])
    expect(getVRPanelOffset('controls')).toEqual([-0.1, -0.2, -2.0])
  })

  it('clearVRPanelOffset entfernt nur das eine Panel', () => {
    saveVRPanelOffset('progress', [0.1, 0.2, -1.0])
    saveVRPanelOffset('controls', [-0.1, -0.2, -2.0])
    clearVRPanelOffset('progress')
    expect(getVRPanelOffset('progress')).toBeNull()
    expect(getVRPanelOffset('controls')).toEqual([-0.1, -0.2, -2.0])
  })

  it('clearVRPanelOffset auf unbekannter ID ist ein No-op', () => {
    expect(() => clearVRPanelOffset('gibt-es-nicht')).not.toThrow()
  })
})

describe('defensives Laden', () => {
  it('übersteht kaputtes JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{kein json')
    expect(loadVRPanelOffsets()).toEqual({})
  })

  it('übersteht falsche Typen im Storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ok:        [0.1, 0.2, -1.0],
      kaputt1:   'string',
      kaputt2:   [1, 2],
      kaputt3:   [1, 2, 'drei'],
      kaputt4:   [1, 2, Infinity],
    }))
    const alle = loadVRPanelOffsets()
    expect(Object.keys(alle)).toEqual(['ok'])
    expect(alle['ok']).toEqual([0.1, 0.2, -1.0])
  })

  it('übersteht Array statt Objekt im Storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]))
    expect(loadVRPanelOffsets()).toEqual({})
  })

  it('clampt zu grosse gespeicherte Werte beim Laden', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ p: [99, -99, 0] }))
    expect(loadVRPanelOffsets()['p']).toEqual([
      OFFSET_GRENZEN.x,
      -OFFSET_GRENZEN.y,
      OFFSET_GRENZEN.zMax,
    ])
  })
})
