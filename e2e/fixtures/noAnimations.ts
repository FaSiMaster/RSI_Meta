// Animationen fuer deterministische E2E-Tests stilllegen.
// Framer-Motion wrappt Views in motion.div mit 150-200ms Fade-Transitions.
// Waehrend der Transition stuft Playwright die Elemente als "not stable" ein
// und verweigert Clicks. Mit reducedMotion-Emulation + CSS-Override ist das
// Layout synchron fertig, sobald React committed hat.

import type { Page } from '@playwright/test'

export async function disableAnimations(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
    // Warten bis <head> existiert (vor React-Mount)
    if (document.head) {
      document.head.appendChild(style)
    } else {
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style), { once: true })
    }
  })
}
