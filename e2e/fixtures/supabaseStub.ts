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
  /**
   * Inhalt des Bildspeichers: Ordnername je Szene auf die Dateinamen darin.
   * Ohne diese Angabe antwortet der Speicher wie bisher mit 404 — die
   * meisten Tests brauchen keine Bilder.
   */
  bildspeicher?: Record<string, string[]>
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

  // Grundregel am Bildspeicher: 404 — die meisten Tests brauchen keine
  // Bilder. Sie steht zuerst, weil Playwright der zuletzt eingetragenen
  // Regel den Vorrang gibt: Die genaueren Regeln unten muessen also
  // spaeter kommen, sonst greifen sie nie.
  await page.route('**/storage/v1/**', async route => {
    await route.fulfill({ status: 404, headers: corsHeaders(), body: '' })
  })

  // Bildspeicher: auflisten. Der Client fragt zuerst den Wurzelordner
  // «panoramas» ab (dort stehen die Szenenordner, erkennbar an metadata ===
  // null) und danach jeden Ordner einzeln.
  const speicher = opts.bildspeicher
  if (speicher) {
    await page.route('**/storage/v1/object/list/**', async route => {
      let body: { prefix?: string } = {}
      try { body = route.request().postDataJSON() } catch { /* ignore */ }
      const prefix = body.prefix ?? ''
      let daten: unknown[] = []
      if (prefix === 'panoramas') {
        daten = Object.keys(speicher).map(name => ({
          name, id: null, metadata: null,
          created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
        }))
      } else if (prefix.startsWith('panoramas/')) {
        const ordner = prefix.slice('panoramas/'.length)
        daten = (speicher[ordner] ?? []).map(name => ({
          name, id: name, metadata: { size: 4_300_000, mimetype: 'image/webp' },
          created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
        }))
      }
      await route.fulfill({
        status: 200,
        headers: { ...corsHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify(daten),
      })
    })

    // Die Bilder selbst: ein winziges GIF genuegt. Gemessen wird das Gitter,
    // nicht der Inhalt.
    await page.route('**/storage/v1/object/public/**', async route => {
      await route.fulfill({
        status: 200,
        headers: { ...corsHeaders(), 'content-type': 'image/gif' },
        body: Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64',
        ),
      })
    })
  }

}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  }
}
