// KursModal — CRUD für einen Kurs inkl. Topic-Auswahl und Passwort-Hashing-Hinweis.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Eye, EyeOff } from 'lucide-react'
import { type AppTopic, type Kurs, ml } from '../../../data/appData'
import { useFocusTrap } from '../../../lib/useFocusTrap'
import { Section } from '../fields/Section'
import { generateKursCode } from '../utils/adminHelpers'

interface Props {
  open: boolean
  initial: Kurs | null
  topics: AppTopic[]
  onClose: () => void
  onSave: (kurs: Kurs) => void
}

export default function KursModal({ open, initial, topics, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const modalRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Kurs | null>(initial)
  const [showPasswort, setShowPasswort] = useState(false)

  useFocusTrap(modalRef, open)

  useEffect(() => {
    if (!open) return
    setDraft(initial)
    setShowPasswort(false)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !draft) return null

  function toggleKursTopic(topicId: string) {
    setDraft(prev => {
      if (!prev) return prev
      const ids = prev.topicIds.includes(topicId)
        ? prev.topicIds.filter(id => id !== topicId)
        : [...prev.topicIds, topicId]
      return { ...prev, topicIds: ids }
    })
  }

  function handleSave() {
    if (!draft) return
    onSave(draft)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={modalRef} role="dialog" aria-modal="true" style={{ width: '520px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{t('admin.kurs_neu')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
        </div>

        <Section label={t('admin.kurs_name')}>
          <input value={draft.name} onChange={e => setDraft(prev => prev ? { ...prev, name: e.target.value } : prev)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
        </Section>

        <Section label={t('admin.kurs_datum')}>
          <input type="date" value={draft.datum} onChange={e => setDraft(prev => prev ? { ...prev, datum: e.target.value } : prev)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
        </Section>

        <Section label={`${t('admin.gueltig_von')} / ${t('admin.gueltig_bis')}`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('admin.gueltig_von')}</div>
              <input type="datetime-local"
                value={draft.gueltigVon != null ? new Date(draft.gueltigVon).toISOString().slice(0, 16) : ''}
                onChange={e => setDraft(prev => prev ? { ...prev, gueltigVon: e.target.value ? new Date(e.target.value).getTime() : null } : prev)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '12px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('admin.gueltig_bis')}</div>
              <input type="datetime-local"
                value={draft.gueltigBis != null ? new Date(draft.gueltigBis).toISOString().slice(0, 16) : ''}
                onChange={e => setDraft(prev => prev ? { ...prev, gueltigBis: e.target.value ? new Date(e.target.value).getTime() : null } : prev)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '12px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
            </div>
          </div>
        </Section>

        <Section label={t('admin.passwort')}>
          {draft.hatPasswort === true && (draft.passwort === undefined || draft.passwort === '') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--zh-gruen)', fontWeight: 700 }}>Passwort gesetzt (gehasht)</span>
              <button
                type="button"
                onClick={() => setDraft(prev => prev ? { ...prev, passwort: null } : prev)}
                style={{ background: 'none', border: '1px solid var(--zh-color-border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', color: 'var(--zh-rot)', fontFamily: 'var(--zh-font)' }}
              >
                Passwort entfernen / neu setzen
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswort ? 'text' : 'password'}
                value={draft.passwort ?? ''}
                onChange={e => setDraft(prev => prev ? { ...prev, passwort: e.target.value || null } : prev)}
                placeholder={t('admin.passwort_hinweis')}
                // Autofill deaktivieren: verhindert dass der Browser-
                // Passwort-Manager das Admin-PIN hier einfuellt (unsichtbar
                // durch type=password) und dass das native Autofill-
                // Dropdown den Modal-Backdrop-Klick ausloest.
                name="rsi-kurs-passwort"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                style={{ width: '100%', padding: '8px 40px 8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswort(v => !v)}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center' }}
              >
                {showPasswort ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          )}
          <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginTop: '4px' }}>
            Beim Speichern wird das Passwort gehasht. Klartext ist danach nicht mehr einsehbar.
          </p>
        </Section>

        <Section label={t('admin.kurs_code')}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={draft.zugangscode} onChange={e => setDraft(prev => prev ? { ...prev, zugangscode: e.target.value } : prev)}
              placeholder="FK-RSI-123456"
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }} />
            <button onClick={() => setDraft(prev => prev ? { ...prev, zugangscode: generateKursCode() } : prev)}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-blau)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t('admin.kurs_generieren')}
            </button>
          </div>
        </Section>

        <Section label={t('admin.kurs_topics')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topics.filter(tp => tp.isActive).map(tp => (
              <label key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={draft.topicIds.includes(tp.id)}
                  onChange={() => toggleKursTopic(tp.id)} />
                {ml(tp.nameI18n, lang)}
              </label>
            ))}
          </div>
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
