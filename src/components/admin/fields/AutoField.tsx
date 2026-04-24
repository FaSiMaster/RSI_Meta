export function AutoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ padding: '7px 10px', borderRadius: '6px', background: 'var(--zh-color-bg-tertiary)', color: 'var(--zh-color-text)', fontSize: '13px', fontWeight: 700 }}>{value}</div>
    </div>
  )
}
