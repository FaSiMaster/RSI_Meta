// SzeneModal — CRUD für eine AppScene inkl. Strassenmerkmale, Panorama, Perspektiven, Vorschaubilder.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Trash2 } from 'lucide-react'
import type { AppScene, StrassenMerkmal } from '../../../data/appData'
import { STRASSENMERKMALE_KATALOG } from '../../../data/strassenmerkmale'
import { useFocusTrap } from '../../../lib/useFocusTrap'
import BildUpload from '../BildUpload'
import { Section } from '../fields/Section'
import { MLInput } from '../fields/MLInput'
import { MLTextarea } from '../fields/MLTextarea'
import { VorschaubildEditor } from '../fields/VorschaubildEditor'
import { getVorschauModus, type VorschauModus } from '../utils/adminHelpers'

interface Props {
  open: boolean
  initial: AppScene | null
  isNew: boolean
  onClose: () => void
  onSave: (scene: AppScene) => void
  onOpenBildEditor: (scene: AppScene) => void
}

// Szene vor Speichern normalisieren:
// - vorschauBilder: leere Strings raus
// - Strassenmerkmale: FR/IT/EN mit DE-Wert auffuellen falls leer
function normalizeForSave(scene: AppScene): AppScene {
  const vorschauBilder = (scene.vorschauBilder ?? []).filter(s => s.trim().length > 0)
  const strassenmerkmale = (scene.strassenmerkmale ?? []).map(m => ({
    ...m,
    labelI18n: {
      de: m.labelI18n.de,
      fr: m.labelI18n.fr || m.labelI18n.de,
      it: m.labelI18n.it || m.labelI18n.de,
      en: m.labelI18n.en || m.labelI18n.de,
    },
    wertI18n: {
      de: m.wertI18n.de,
      fr: m.wertI18n.fr || m.wertI18n.de,
      it: m.wertI18n.it || m.wertI18n.de,
      en: m.wertI18n.en || m.wertI18n.de,
    },
  }))
  return { ...scene, vorschauBilder, strassenmerkmale }
}

export default function SzeneModal({ open, initial, isNew, onClose, onSave, onOpenBildEditor }: Props) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<AppScene | null>(initial)
  const [panoramaVorschau, setPanoramaVorschau] = useState<{ url: string; breite: number; hoehe: number } | null>(null)
  const [vorschau1Modus, setVorschau1Modus] = useState<VorschauModus>('kein')
  const [vorschau2Modus, setVorschau2Modus] = useState<VorschauModus>('kein')

  useFocusTrap(modalRef, open)

  // Draft + abhängige States bei Öffnen initialisieren
  useEffect(() => {
    if (!open) return
    setDraft(initial)
    setPanoramaVorschau(null)
    setVorschau1Modus(getVorschauModus(initial?.vorschauBild1))
    setVorschau2Modus(getVorschauModus(initial?.vorschauBild2))
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const perspektiven = useMemo(() => draft?.perspektiven ?? [], [draft?.perspektiven])

  if (!open || !draft) return null

  function setSceneML(field: 'nameI18n' | 'beschreibungI18n' | 'bemerkungI18n', l: string, v: string) {
    setDraft(prev => prev ? { ...prev, [field]: { ...(prev[field] ?? { de:'', fr:'', it:'', en:'' }), [l]: v } } : prev)
  }

  function initMerkmaleFromKatalog() {
    if (!draft) return
    const existing = draft.strassenmerkmale ?? []
    if (existing.length > 0) return
    const merkmale: StrassenMerkmal[] = []
    for (const kat of STRASSENMERKMALE_KATALOG) {
      for (const m of kat.merkmale) {
        merkmale.push({
          id: m.id,
          labelI18n: { de: m.label, fr: m.label, it: m.label, en: m.label },
          wertI18n: { de: '', fr: '', it: '', en: '' },
        })
      }
    }
    setDraft(prev => prev ? { ...prev, strassenmerkmale: merkmale } : prev)
  }
  function addMerkmal() {
    const neu: StrassenMerkmal = {
      labelI18n: { de: '', fr: '', it: '', en: '' },
      wertI18n: { de: '', fr: '', it: '', en: '' },
    }
    setDraft(prev => prev ? { ...prev, strassenmerkmale: [...(prev.strassenmerkmale ?? []), neu] } : prev)
  }
  function updateMerkmal(i: number, field: 'labelI18n' | 'wertI18n', val: string) {
    setDraft(prev => {
      if (!prev) return prev
      const list = [...(prev.strassenmerkmale ?? [])]
      list[i] = { ...list[i], [field]: { ...list[i][field], de: val } }
      return { ...prev, strassenmerkmale: list }
    })
  }
  function removeMerkmal(i: number) {
    setDraft(prev => {
      if (!prev) return prev
      const list = [...(prev.strassenmerkmale ?? [])]
      list.splice(i, 1)
      return { ...prev, strassenmerkmale: list }
    })
  }

  function handleSave() {
    if (!draft) return
    onSave(normalizeForSave(draft))
  }

  function handleOpenBildEditorLocal() {
    if (!draft) return
    onOpenBildEditor(normalizeForSave(draft))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={modalRef} role="dialog" aria-modal="true" style={{ width: '680px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--rsi-radius-card)', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', padding: '28px 32px', boxShadow: 'var(--rsi-shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rsi-color-text)' }}>{isNew ? t('admin.szene_neu') : t('admin.szene_bearbeiten')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rsi-color-text-muted)' }}><X size={18} /></button>
        </div>

        <Section label="Szenenname">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLInput key={l} label={l.toUpperCase()} value={(draft.nameI18n as unknown as Record<string,string>)[l] ?? ''} onChange={v => setSceneML('nameI18n', l, v)} />
            ))}
          </div>
        </Section>

        <Section label={t('admin.szene_beschreibung')}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLTextarea key={l} label={l.toUpperCase()} value={(draft.beschreibungI18n as unknown as Record<string,string> | undefined)?.[l] ?? ''} onChange={v => setSceneML('beschreibungI18n', l, v)} />
            ))}
          </div>
        </Section>

        {/* D-3: Trainer-Bemerkung (optional) */}
        <Section label="Trainer-Hinweis (optional, wird vor Szenenstart angezeigt)">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLTextarea
                key={l}
                label={l.toUpperCase()}
                value={(draft.bemerkungI18n as unknown as Record<string,string> | undefined)?.[l] ?? ''}
                onChange={v => setSceneML('bemerkungI18n', l, v)}
              />
            ))}
          </div>
        </Section>

        <Section label={t('admin.szene_kontext')}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['io','ao'] as const).map(k => (
              <button key={k} onClick={() => setDraft(prev => prev ? { ...prev, kontext: k } : prev)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: draft.kontext === k ? '2px solid var(--rsi-blau)' : '1px solid var(--rsi-color-border)', background: draft.kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--rsi-color-surface)', color: draft.kontext === k ? 'var(--rsi-blau)' : 'var(--rsi-color-text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                {k === 'io' ? 'Innerorts' : 'Ausserorts'}
              </button>
            ))}
          </div>
        </Section>

        {/* Bestanden-Kriterium (v0.9.7): optionaler Szenen-Override des
            app-weiten Defaults (alle Pflichtdefizite + 60 %). */}
        <Section label={t('admin.bestanden_titel')}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--rsi-color-text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.bestandenKriterium?.allePflicht ?? true}
                onChange={e => setDraft(prev => prev ? {
                  ...prev,
                  bestandenKriterium: { ...prev.bestandenKriterium, allePflicht: e.target.checked },
                } : prev)}
              />
              {t('admin.bestanden_pflicht')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--rsi-color-text)' }}>
              {t('admin.bestanden_prozent')}
              <input
                type="number"
                min={0}
                max={100}
                value={draft.bestandenKriterium?.minProzent === null ? '' : (draft.bestandenKriterium?.minProzent ?? 60)}
                placeholder="—"
                onChange={e => {
                  const raw = e.target.value
                  const val = raw === '' ? null : Math.max(0, Math.min(100, Number(raw)))
                  setDraft(prev => prev ? {
                    ...prev,
                    bestandenKriterium: { ...prev.bestandenKriterium, minProzent: val },
                  } : prev)
                }}
                style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)', color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)' }}
              />
              %
            </label>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-disabled)', marginTop: '6px' }}>
            {t('admin.bestanden_hinweis')}
          </p>
        </Section>

        <Section label={t('admin.merkmale_label')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(draft.strassenmerkmale ?? []).length === 0 && (
              <button onClick={initMerkmaleFromKatalog} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px dashed var(--rsi-color-border)', background: 'rgba(0,118,189,0.04)', color: 'var(--rsi-blau)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                Katalog laden
              </button>
            )}
            {(draft.strassenmerkmale ?? []).map((m, i) => {
              const katalogDef = m.id ? STRASSENMERKMALE_KATALOG.flatMap(k => k.merkmale).find(d => d.id === m.id) : null
              return (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--rsi-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {katalogDef ? katalogDef.label : 'Label (DE)'}
                    </div>
                    {!katalogDef ? (
                      <input value={m.labelI18n.de} onChange={e => updateMerkmal(i, 'labelI18n', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)', color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)', boxSizing: 'border-box' }} />
                    ) : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    {katalogDef && katalogDef.optionen.length > 0 ? (
                      <select
                        value={m.wertI18n.de}
                        onChange={e => updateMerkmal(i, 'wertI18n', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)', color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)', boxSizing: 'border-box', cursor: 'pointer' }}
                      >
                        <option value="">— auswählen —</option>
                        {katalogDef.optionen.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={m.wertI18n.de} onChange={e => updateMerkmal(i, 'wertI18n', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)', color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)', boxSizing: 'border-box' }} />
                    )}
                  </div>
                  <button onClick={() => removeMerkmal(i)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', color: 'var(--rsi-rot)', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
            {(draft.strassenmerkmale ?? []).length > 0 && (
              <button onClick={addMerkmal} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px dashed var(--rsi-color-border)', background: 'transparent', color: 'var(--rsi-blau)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                {t('admin.merkmale_hinzufügen')}
              </button>
            )}
          </div>
        </Section>

        {/* 360°-Panoramabild via BildUpload */}
        <Section label="360°-Panoramabild">
          <BildUpload
            szeneId={draft.id}
            aktuelleUrl={draft.panoramaBildUrl}
            defaultRole="haupt"
            onBildGeladen={(url, breite, hoehe) => {
              setDraft(prev => prev ? { ...prev, panoramaBildUrl: url } : prev)
              setPanoramaVorschau({ url, breite, hoehe })
            }}
          />
          {panoramaVorschau && (
            <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-muted)', marginTop: '6px' }}>
              Geladen: {panoramaVorschau.breite.toLocaleString('de-CH')} × {panoramaVorschau.hoehe.toLocaleString('de-CH')} Pixel
            </p>
          )}
          {draft.panoramaBildUrl && (
            <button
              onClick={handleOpenBildEditorLocal}
              style={{
                marginTop: '8px',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '6px',
                background: 'rgba(0,118,189,0.1)', color: 'var(--rsi-blau)',
                border: '1px solid rgba(0,118,189,0.3)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--rsi-font)',
              }}
            >
              Verortungs-Editor öffnen
            </button>
          )}
        </Section>

        {/* Perspektiven (mehrere Panorama-Bilder pro Szene) */}
        <Section label="Perspektiven (Standortwechsel)">
          <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-muted)', marginBottom: '10px' }}>
            Mehrere Panoramabilder für dieselbe Szene. Defizite können pro Perspektive neu verortet werden.
          </p>
          {perspektiven.map((p, i) => (
            <div key={p.id} style={{
              padding: '10px 12px', borderRadius: '8px',
              border: '1px solid var(--rsi-color-border)',
              background: 'var(--rsi-color-bg-secondary)',
              marginBottom: '8px',
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--rsi-blau)', minWidth: '20px' }}>{i + 1}</span>
                <input
                  value={p.label}
                  onChange={e => {
                    const updated = [...perspektiven]
                    updated[i] = { ...updated[i], label: e.target.value }
                    setDraft(prev => prev ? { ...prev, perspektiven: updated } : prev)
                  }}
                  placeholder="Label (z.B. Standort A)"
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: '4px',
                    border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)',
                    color: 'var(--rsi-color-text)', fontSize: '12px', fontFamily: 'var(--rsi-font)',
                  }}
                />
                <button
                  onClick={() => {
                    const updated = perspektiven.filter((_, j) => j !== i)
                    setDraft(prev => prev ? { ...prev, perspektiven: updated } : prev)
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--rsi-rot)', padding: '2px', flexShrink: 0,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {/* Panoramabild für Perspektive */}
              <BildUpload
                szeneId={draft.id}
                aktuelleUrl={p.bildUrl || null}
                defaultRole="perspektive"
                perspektivenNr={i + 1}
                perspektivenLabel={p.label}
                onBildGeladen={(url) => {
                  const updated = [...perspektiven]
                  updated[i] = { ...updated[i], bildUrl: url }
                  setDraft(prev => prev ? { ...prev, perspektiven: updated } : prev)
                }}
              />
              {p.bildUrl && (
                <p style={{ fontSize: '10px', color: 'var(--rsi-color-text-disabled)', marginTop: '4px' }}>
                  {p.bildUrl}
                </p>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const newP = {
                id: `persp-${Date.now()}`,
                label: `Standort ${perspektiven.length + 1}`,
                bildUrl: '',
              }
              setDraft(prev => prev ? {
                ...prev,
                perspektiven: [...(prev.perspektiven ?? []), newP],
              } : prev)
            }}
            style={{
              padding: '7px 14px', borderRadius: '6px',
              border: '1px dashed var(--rsi-color-border)',
              background: 'transparent', color: 'var(--rsi-blau)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--rsi-font)',
            }}
          >
            + Perspektive hinzufügen
          </button>
        </Section>

        {/* Vorschaubilder */}
        <Section label={t('admin.einstieg_titel')}>
          <VorschaubildEditor
            key={`${draft.id}-1`}
            label={t('admin.vorschau1')}
            value={draft.vorschauBild1}
            panoramaBildUrl={draft.panoramaBildUrl}
            modus={vorschau1Modus}
            onModusChange={m => {
              setVorschau1Modus(m)
              if (m === 'kein') setDraft(prev => prev ? { ...prev, vorschauBild1: null } : prev)
              if (m === 'panorama') setDraft(prev => prev ? { ...prev, vorschauBild1: 'panorama' } : prev)
            }}
            onBildGeladen={url => {
              setDraft(prev => prev ? { ...prev, vorschauBild1: url } : prev)
              setVorschau1Modus('upload')
            }}
            szeneId={draft.id}
          />

          <VorschaubildEditor
            key={`${draft.id}-2`}
            label={t('admin.vorschau2')}
            value={draft.vorschauBild2}
            panoramaBildUrl={draft.panoramaBildUrl}
            modus={vorschau2Modus}
            onModusChange={m => {
              setVorschau2Modus(m)
              if (m === 'kein') setDraft(prev => prev ? { ...prev, vorschauBild2: null } : prev)
              if (m === 'panorama') setDraft(prev => prev ? { ...prev, vorschauBild2: 'panorama' } : prev)
            }}
            onBildGeladen={url => {
              setDraft(prev => prev ? { ...prev, vorschauBild2: url } : prev)
              setVorschau2Modus('upload')
            }}
            szeneId={draft.id}
          />

          <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-disabled)', marginTop: '4px' }}>
            {t('admin.mehrsprachen_hinweis')}
          </p>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 'var(--rsi-radius-btn)', border: '1px solid var(--rsi-color-border)', background: 'transparent', color: 'var(--rsi-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('admin.cancelBtn')}</button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--rsi-radius-btn)', background: 'var(--rsi-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
            <Save size={14} /> {t('admin.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
