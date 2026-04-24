import type { ReactNode } from 'react'

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)', marginBottom: '8px' }}>{label}</p>
      {children}
    </div>
  )
}
