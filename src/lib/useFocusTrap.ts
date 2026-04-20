// useFocusTrap (E-7) — haelt den Tastatur-Fokus innerhalb eines Containers
// solange das Modal geoeffnet ist. WCAG 2.4.3 (Focus Order) + 2.1.2
// (No Keyboard Trap — ESC-Schliessen muss zusaetzlich vom Caller bereitstellt
// werden, das ist hier ueblich).
//
// Verwendung:
//   const ref = useRef<HTMLDivElement>(null)
//   useFocusTrap(ref, isOpen)
//   return isOpen ? <div ref={ref}>...</div> : null

import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    // Vorigen Fokus merken, beim Schliessen wiederherstellen
    const previouslyFocused = document.activeElement as HTMLElement | null

    function getFocusable(): HTMLElement[] {
      const c = containerRef.current
      if (!c) return []
      return Array.from(c.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter(el => !el.hasAttribute('aria-hidden') && el.offsetParent !== null)
    }

    // Initial-Fokus auf erstes fokussierbares Element
    // (Timeout damit das DOM stabil ist nach Animation)
    const focusTimeout = window.setTimeout(() => {
      const focusables = getFocusable()
      if (focusables.length > 0) focusables[0].focus()
    }, 30)

    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const c = containerRef.current
      if (!c) return
      const focusables = getFocusable()
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last  = focusables[focusables.length - 1]
      const current = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        // Shift+Tab am ersten Element → springt zum letzten
        if (current === first || !c.contains(current)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab am letzten Element → springt zum ersten
        if (current === last || !c.contains(current)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      window.clearTimeout(focusTimeout)
      document.removeEventListener('keydown', handleKey)
      // Fokus zurueck auf vorheriges Element (falls noch im DOM)
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [containerRef, active])
}
