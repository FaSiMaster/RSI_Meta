// Mehrsprachiges Textarea
export function MLTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--rsi-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)', color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)', resize: 'vertical', boxSizing: 'border-box' }} />
    </div>
  )
}
