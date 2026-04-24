// DefizitModal — CRUD für ein AppDeficit.
// Hält eigenen Draft-State, gibt beim Speichern fertig recompute()-tes Objekt zurück.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save } from 'lucide-react'
import type { AppDeficit, AppScene } from '../../../data/appData'
import { WICHTIGKEIT_TABLE, calcRelevanzSD, calcUnfallrisiko, nacaToSchwere } from '../../../data/scoringEngine'
import type { NacaRaw } from '../../../data/scoringEngine'
import { KRITERIUM_LABELS } from '../../../data/kriteriumLabels'
import type { RSIDimension, NACADimension, ResultDimension } from '../../../types'
import { useFocusTrap } from '../../../lib/useFocusTrap'
import { recompute } from '../utils/adminHelpers'
import { Section } from '../fields/Section'
import { SelectField } from '../fields/SelectField'
import { AutoField } from '../fields/AutoField'
import { MLInput } from '../fields/MLInput'
import { NormRefPicker } from '../fields/NormRefPicker'

interface Props {
  open: boolean
  initial: AppDeficit | null
  scene: AppScene | null
  onClose: () => void
  onSave: (d: AppDeficit) => void
  onOpenBildEditor: (d: AppDeficit) => void
}

export default function DefizitModal({ open, initial, scene, onClose, onSave, onOpenBildEditor }: Props) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<AppDeficit | null>(initial)

  useFocusTrap(modalRef, open)

  // Draft bei Öffnen synchronisieren
  useEffect(() => {
    if (open) setDraft(initial)
  }, [open, initial])

  // ESC-Schliessen
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !draft) return null

  function setCA<K extends keyof AppDeficit['correctAssessment']>(k: K, v: AppDeficit['correctAssessment'][K]) {
    setDraft(prev => prev ? { ...prev, correctAssessment: { ...prev.correctAssessment, [k]: v } } : prev)
  }
  function setML(field: 'nameI18n' | 'beschreibungI18n', l: string, v: string) {
    setDraft(prev => prev ? { ...prev, [field]: { ...prev[field], [l]: v } } : prev)
  }

  function handleSave() {
    if (!draft) return
    onSave(recompute(draft))
  }

  function handleOpenBildEditor() {
    if (!draft) return
    onOpenBildEditor(recompute(draft))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={modalRef} role="dialog" aria-modal="true" style={{ width: '680px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
            {draft.id.startsWith('d-') ? t('admin.modalTitleNew') : t('admin.modalTitleEdit')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
        </div>

        <Section label={t('admin.fieldTitle')}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLInput key={l} label={l.toUpperCase()} value={draft.nameI18n[l]} onChange={v => setML('nameI18n', l, v)} />
            ))}
          </div>
        </Section>
        <Section label={t('admin.fieldDesc')}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLInput key={l} label={l.toUpperCase()} value={draft.beschreibungI18n[l]} onChange={v => setML('beschreibungI18n', l, v)} />
            ))}
          </div>
        </Section>

        {/* D-7: Kategorie steht jetzt vor Kriterium & Kontext */}
        <Section label="Kategorie">
          <select value={draft.kategorie ?? ''}
            onChange={e => setDraft(prev => prev ? { ...prev, kategorie: (e.target.value as AppDeficit['kategorie']) || undefined } : prev)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
            <option value="">— keine —</option>
            <option value="verkehrsfuehrung">Verkehrsführung</option>
            <option value="sicht">Sicht</option>
            <option value="ausruestung">Ausrüstung</option>
            <option value="zustand">Zustand Verkehrsfläche</option>
            <option value="strassenrand">Strassenrand</option>
            <option value="verkehrsablauf">Verkehrsablauf</option>
            <option value="baustelle">Baustelle</option>
          </select>
        </Section>

        <Section label="Kriterium & Kontext">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sicherheitskriterium</div>
              <select value={draft.kriteriumId} onChange={e => setDraft(prev => prev ? { ...prev, kriteriumId: e.target.value } : prev)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
                {Object.entries(KRITERIUM_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kontext</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['io','ao'] as const).map(k => (
                  <button key={k} onClick={() => setDraft(prev => prev ? { ...prev, kontext: k } : prev)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: draft.kontext === k ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)', background: draft.kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)', color: draft.kontext === k ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                    {k === 'io' ? 'Innerorts' : 'Ausserorts'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {WICHTIGKEIT_TABLE[draft.kriteriumId] && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
              Wichtigkeit gemäss Tabelle: <strong style={{ color: 'var(--zh-blau)' }}>{WICHTIGKEIT_TABLE[draft.kriteriumId][draft.kontext] || '—'}</strong>
            </div>
          )}
        </Section>

        <Section label="RSI-Bewertung (Lösung)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <SelectField label="Wichtigkeit" value={draft.correctAssessment.wichtigkeit}
              options={[['gross','Gross'],['mittel','Mittel'],['klein','Klein']]}
              onChange={v => setCA('wichtigkeit', v as RSIDimension)} />
            <SelectField label="Abweichung" value={draft.correctAssessment.abweichung}
              options={[['gross','Gross'],['mittel','Mittel'],['klein','Klein']]}
              onChange={v => setCA('abweichung', v as RSIDimension)} />
            <SelectField label="NACA (0–7)" value={String(draft.correctAssessment.naca)}
              options={['0','1','2','3','4','5','6','7'].map(n => [n, `NACA ${n}`])}
              onChange={v => setCA('naca', Number(v) as NacaRaw)} />
          </div>
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--zh-color-bg-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {(() => {
              const rs = calcRelevanzSD(draft.correctAssessment.wichtigkeit, draft.correctAssessment.abweichung) as ResultDimension
              const us = nacaToSchwere(draft.correctAssessment.naca) as NACADimension
              const ur = calcUnfallrisiko(rs, us) as ResultDimension
              return (
                <>
                  <AutoField label="Relevanz SD" value={rs} />
                  <AutoField label="Unfallschwere" value={us} />
                  <AutoField label="Unfallrisiko" value={ur} />
                </>
              )
            })()}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginTop: '4px' }}>Relevanz SD, Unfallschwere und Unfallrisiko werden automatisch berechnet.</p>
        </Section>

        <Section label="Eigenschaften">
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.isPflicht}
                onChange={e => setDraft(prev => prev ? { ...prev, isPflicht: e.target.checked } : prev)}
              />
              Pflichtdefizit
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.isBooster}
                onChange={e => setDraft(prev => prev ? {
                  ...prev,
                  isBooster: e.target.checked,
                  // Default-Bonus 10 % wenn Booster neu aktiviert
                  boosterBonusProzent: e.target.checked ? (prev.boosterBonusProzent ?? 10) : undefined,
                } : prev)}
              />
              Booster
            </label>
            {/* D-9: Bonus-%-Auswahl, nur sichtbar wenn Booster aktiv */}
            {draft.isBooster && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-muted)' }}>
                  Bonus
                </span>
                {([10, 20] as const).map(pct => (
                  <label key={pct} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="boosterBonusProzent"
                      checked={(draft.boosterBonusProzent ?? 10) === pct}
                      onChange={() => setDraft(prev => prev ? { ...prev, boosterBonusProzent: pct } : prev)}
                    />
                    +{pct}%
                  </label>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section label="Normreferenzen">
          <NormRefPicker
            value={draft.normRefs}
            onChange={refs => setDraft(prev => prev ? { ...prev, normRefs: refs } : prev)}
          />
        </Section>

        {/* Verortung im Bild */}
        <Section label={t('admin.verortung')}>
          {scene?.panoramaBildUrl ? (
            <div>
              {draft.verortung && (
                <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                  Aktuell: <strong style={{ color: 'var(--zh-blau)' }}>{draft.verortung.typ}</strong>
                </div>
              )}
              <button
                onClick={handleOpenBildEditor}
                style={{
                  padding: '8px 16px', borderRadius: '6px',
                  background: 'rgba(0,118,189,0.1)', color: 'var(--zh-blau)',
                  border: '1px solid rgba(0,118,189,0.3)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--zh-font)',
                }}
              >
                {t('admin.panorama_editor')}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
              Zuerst Panoramabild für diese Szene setzen.
            </p>
          )}
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', border: '1px solid var(--zh-color-border)', background: 'transparent', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('admin.cancelBtn')}</button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
            <Save size={14} /> {t('admin.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
