// Sprachwahl-Pillen: DE | FR | IT | EN
// E-6: Touch-Target 44x44px (WCAG 2.5.5 Target Size) + aria-pressed
// fuer Screen-Reader (WCAG 4.1.2 Name, Role, Value).
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

const LANGS = ['de', 'fr', 'it', 'en'] as const

const LANG_LABELS: Record<typeof LANGS[number], string> = {
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  en: 'English',
}

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()

  const handleChange = (lang: string) => {
    void i18n.changeLanguage(lang)
    localStorage.setItem('rsi-lang', lang)
  }

  return (
    <div role="group" aria-label="Sprache / Language" className={cn('flex items-center gap-1', className)}>
      {LANGS.map((lang) => {
        const aktiv = i18n.language === lang || i18n.language.slice(0, 2) === lang
        return (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            aria-pressed={aktiv}
            aria-label={LANG_LABELS[lang]}
            className={cn(
              'inline-flex items-center justify-center rounded-md text-[12px] font-bold uppercase tracking-widest transition-all',
              aktiv
                ? 'bg-[var(--zh-color-accent)] text-white'
                : 'text-[var(--zh-color-text-muted)] hover:text-[var(--zh-color-text)] hover:bg-[var(--zh-color-bg-tertiary)]',
            )}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '0 8px',
            }}
          >
            {lang}
          </button>
        )
      })}
    </div>
  )
}
