// Supabase-Stub fuer E2E: faengt alle Aufrufe an die Edge Functions und
// an /rest/v1 ab, damit Tests ohne echte Supabase-Verbindung laufen.

import type { Page } from '@playwright/test'

// Ein fester Token der vom Stub zurueckgegeben wird. Nicht produktiv gueltig.
const STUB_TOKEN = `${Date.now() + 2 * 3600 * 1000}.stub-signature-base64`

export interface StubOptions {
  /** Admin-PIN, der akzeptiert wird (Default '5004'). */
  adminPin?: string
  /** Erlaubt dem Test den letzten admin-write-Body zu inspizieren. */
  onAdminWrite?: (body: unknown) => void
}

export async function installSupabaseStub(page: Page, opts: StubOptions = {}): Promise<void> {
  const expectedPin = opts.adminPin ?? '5004'

  // admin-auth: PIN gegen Token tauschen
  await page.route('**/functions/v1/admin-auth', async route => {
    const req = route.request()
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }
    let body: { pin?: string } = {}
    try { body = req.postDataJSON() } catch { /* ignore */ }
    if (body.pin === expectedPin) {
      const expiresAt = Date.now() + 2 * 3600 * 1000
      await route.fulfill({
        status: 200,
        headers: { ...corsHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ token: STUB_TOKEN, expiresAt }),
      })
    } else {
      await route.fulfill({
        status: 401,
        headers: { ...corsHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'unauthorized' }),
      })
    }
  })

  // admin-write: jeden Upsert/Delete durchlassen (ok: true)
  await page.route('**/functions/v1/admin-write', async route => {
    const req = route.request()
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }
    let body: unknown = null
    try { body = req.postDataJSON() } catch { /* ignore */ }
    opts.onAdminWrite?.(body)
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })
  })

  // REST (Direct-Select fuer Topics/Scenes/Deficits/Kurse):
  // Wichtig: NICHT 200 mit [] liefern — das wuerde supabaseSync.initSupabaseData
  // als "Supabase leer" interpretieren und unsere localStorage-Seeds mit []
  // ueberschreiben. Stattdessen 503 → Supabase-Client liefert Error → try/catch
  // in initSupabaseData greift → localStorage bleibt unberuehrt → getTopics()
  // fallback auf readJSON(K_TOPICS) greift.
  await page.route('**/rest/v1/**', async route => {
    await route.fulfill({
      status: 503,
      headers: { ...corsHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'stub-offline' }),
    })
  })

  // Storage (Panorama-Bilder): 404 — Tests brauchen keine echten Bilder
  await page.route('**/storage/v1/**', async route => {
    await route.fulfill({ status: 404, headers: corsHeaders(), body: '' })
  })
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  }
}
