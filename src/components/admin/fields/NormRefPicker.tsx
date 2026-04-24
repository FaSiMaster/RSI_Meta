// NormRefPicker (D-8) — Tag-System mit Autocomplete aus Regelwerk-Katalog
import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { searchRegelwerk, formatRegelwerkString, type RegelwerkEintrag } from '../../../data/regelwerkKatalog'

interface NormRefPickerProps {
  value: string[]
  onChange: (refs: string[]) => void
}

export function NormRefPicker({ value, onChange }: NormRefPickerProps) {
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [freeInput, setFreeInput] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchRegelwerk(query, 8)
      .filter(r => !value.some(v => v.startsWith(r.nummer)))
  }, [query, value])

  function addRef(ref: string) {
    const trimmed = ref.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setQuery('')
    setShowResults(false)
  }

  function removeRef(ref: string) {
    onChange(value.filter(v => v !== ref))
  }

  function handleAddCatalog(item: RegelwerkEintrag) {
    addRef(formatRegelwerkString(item))
  }

  function handleAddFree() {
    if (freeInput.trim()) {
      addRef(freeInput)
      setFreeInput('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Bestehende Tags */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {value.map(ref => (
            <span key={ref} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '14px',
              background: 'rgba(0,118,189,0.10)', color: 'var(--zh-blau)',
              border: '1px solid rgba(0,118,189,0.25)',
              fontSize: '12px', fontWeight: 600, fontFamily: 'var(--zh-font)',
            }}>
              {ref}
              <button
                onClick={() => removeRef(ref)}
                aria-label={`Norm ${ref} entfernen`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-blau)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suchfeld */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--zh-color-text-disabled)' }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true) }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Suche nach Norm-Nummer oder Stichwort (z.B. VSS 40 201, Fussverkehr, Sicht)"
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
          />
        </div>
        {showResults && results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
            background: 'var(--zh-color-surface)',
            border: '1px solid var(--zh-color-border)',
            borderRadius: '8px',
            boxShadow: 'var(--zh-shadow-lg)',
            maxHeight: '280px', overflowY: 'auto',
          }}>
            {results.map(r => (
              <button
                key={r.nummer}
                onMouseDown={e => { e.preventDefault(); handleAddCatalog(r) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid var(--zh-color-border)',
                  cursor: 'pointer', fontFamily: 'var(--zh-font)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,118,189,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-blau)', fontFamily: 'monospace' }}>
                  {r.nummer}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginTop: '2px' }}>
                  {r.titel}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Frei-Text fuer eigene Eintraege */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={freeInput}
          onChange={e => setFreeInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFree() } }}
          placeholder="Eigene Referenz hinzufuegen (Enter)"
          style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '12px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
        />
        <button
          onClick={handleAddFree}
          disabled={!freeInput.trim()}
          style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: freeInput.trim() ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)', color: freeInput.trim() ? 'white' : 'var(--zh-color-text-disabled)', fontSize: '12px', fontWeight: 700, cursor: freeInput.trim() ? 'pointer' : 'not-allowed' }}
        >
          Hinzufuegen
        </button>
      </div>
    </div>
  )
}
