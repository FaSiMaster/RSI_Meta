// Sprachwahl-Pillen: DE | FR | IT | EN
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

const LANGS = ['de', 'fr', 'it', 'en'] as const

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()

  const handleChange = (lang: string) => {
    void i18n.changeLanguage(lang)
    localStorage.setItem('rsi-lang', lang)
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {LANGS.map((lang) => (
        <button
          key={lang}
          onClick={() => handleChange(lang)}
          className={cn(
            'px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all',
            i18n.language === lang
              ? 'bg-[var(--zh-color-accent)] text-white'
              : 'text-[var(--zh-color-text-muted)] hover:text-[var(--zh-color-text)] hover:bg-[var(--zh-color-bg-tertiary)]'
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
