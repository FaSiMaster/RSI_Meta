// Einfaches Textfeld für mehrsprachige Felder
export function MLInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
    </div>
  )
}
