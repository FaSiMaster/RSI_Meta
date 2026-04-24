// ThemaModal — CRUD für ein AppTopic (Oberthema / Unterthema).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Sparkles } from 'lucide-react'
import { type AppTopic, getOberthemen, ml } from '../../../data/appData'
import { TOPIC_ICONS, suggestIconKey } from '../../../data/topicIcons'
import { useFocusTrap } from '../../../lib/useFocusTrap'
import { Section } from '../fields/Section'
import { MLInput } from '../fields/MLInput'
import { MLTextarea } from '../fields/MLTextarea'

interface Props {
  open: boolean
  initial: AppTopic | null
  initialTyp: 'ober' | 'unter'
  onClose: () => void
  onSave: (topic: AppTopic, typ: 'ober' | 'unter') => void
}

export default function ThemaModal({ open, initial, initialTyp, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const modalRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<AppTopic | null>(initial)
  const [typ, setTyp] = useState<'ober' | 'unter'>(initialTyp)

  useFocusTrap(modalRef, open)

  useEffect(() => {
    if (!open) return
    setDraft(initial)
    setTyp(initialTyp)
  }, [open, initial, initialTyp])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !draft) return null

  function setThemaML(field: 'nameI18n' | 'beschreibungI18n', l: string, v: string) {
    setDraft(prev => prev ? { ...prev, [field]: { ...prev[field], [l]: v } } : prev)
  }

  function handleSave() {
    if (!draft) return
    const thema: AppTopic = {
      ...draft,
      parentTopicId: typ === 'unter' ? (draft.parentTopicId ?? null) : null,
    }
    onSave(thema, typ)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={modalRef} role="dialog" aria-modal="true" style={{ width: '560px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{draft.nameI18n.de ? t('admin.szene_bearbeiten') : t('admin.thema_neu')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
        </div>

        <Section label="Bezeichnung">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLInput key={l} label={l.toUpperCase()} value={(draft.nameI18n as unknown as Record<string,string>)[l] ?? ''} onChange={v => setThemaML('nameI18n', l, v)} />
            ))}
          </div>
        </Section>

        <Section label="Beschreibung (optional)">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['de','fr','it','en'] as const).map(l => (
              <MLTextarea key={l} label={l.toUpperCase()} value={(draft.beschreibungI18n as unknown as Record<string,string>)[l] ?? ''} onChange={v => setThemaML('beschreibungI18n', l, v)} />
            ))}
          </div>
        </Section>

        {/* D-4: Pikogramm-Picker mit Auto-Vorschlag */}
        <Section label="Pikogramm">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', margin: 0, flex: 1 }}>
              Aktuell: <strong style={{ color: 'var(--zh-blau)' }}>{draft.iconKey ?? 'kein Icon'}</strong>
            </p>
            <button
              onClick={() => {
                const suggestion = suggestIconKey(draft.nameI18n)
                if (suggestion) {
                  setDraft(prev => prev ? { ...prev, iconKey: suggestion } : prev)
                }
              }}
              title="Icon aus Themenname vorschlagen"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '11px', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}
            >
              <Sparkles size={11} /> Vorschlag
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '6px', maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
            {TOPIC_ICONS.map(({ key, label, Icon }) => {
              const aktiv = draft.iconKey === key
              return (
                <button
                  key={key}
                  onClick={() => setDraft(prev => prev ? { ...prev, iconKey: key } : prev)}
                  title={label}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '8px 4px', borderRadius: '8px',
                    border: aktiv ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
                    background: aktiv ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-bg-secondary)',
                    color: aktiv ? 'var(--zh-blau)' : 'var(--zh-color-text)',
                    cursor: 'pointer', fontFamily: 'var(--zh-font)',
                  }}
                >
                  <Icon size={20} />
                  <span style={{ fontSize: '9px', fontWeight: 600, lineHeight: 1.1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section label={t('admin.thema_typ')}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {(['ober','unter'] as const).map(val => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                <input type="radio" checked={typ === val} onChange={() => setTyp(val)} />
                {val === 'ober' ? t('admin.oberthema') : t('admin.unterthema')}
              </label>
            ))}
          </div>
        </Section>

        {typ === 'unter' && (
          <Section label={t('admin.thema_oberthema_wählen')}>
            <select
              value={draft.parentTopicId ?? ''}
              onChange={e => setDraft(prev => prev ? { ...prev, parentTopicId: e.target.value || null } : prev)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
              <option value="">— Bitte auswählen —</option>
              {getOberthemen().map(ot => (
                <option key={ot.id} value={ot.id}>{ml(ot.nameI18n, lang)}</option>
              ))}
            </select>
          </Section>
        )}

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
