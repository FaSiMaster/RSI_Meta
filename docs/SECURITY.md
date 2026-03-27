# Sicherheitshinweise – RSI VR Tool

---

## Aktueller Status (Phase 1 / Prototyp)

**Diese Applikation ist ein lokaler Entwicklungsprototyp.**
Sie ist NICHT für den öffentlichen Produktionseinsatz geeignet.

---

## Phase-1-Sicherheitslücken — Status nach v0.1.2

| # | Lücke | Risiko | Status |
|---|-------|--------|--------|
| 1 | Admin-API ohne Authentifizierung | Hoch | ✅ Behoben — `requireAdmin` Middleware + `X-Admin-Key` Header |
| 2 | Keine Input-Validierung auf API-Endpunkten | Hoch | ✅ Behoben — Zod-Schemas auf allen API-Routes |
| 3 | In-Memory-Daten (kein Datenverlustschutz) | Mittel | ⚠ Offen — Phase 2 (SQLite oder JSON-Persistenz) |
| 4 | CORS nicht konfiguriert | Mittel | ✅ Behoben — `cors` Middleware, dev/prod Konfiguration |
| 5 | fetch-Calls ohne Error-Handling | Mittel | ✅ Behoben — `apiFetch<T>` Helper, globaler Error-Toast |
| 6 | Kein globaler Express Error-Handler | Mittel | ✅ Behoben — `app.use((err, _req, res, _next) => ...)` |

---

## Verbleibende offene Punkte (Phase 2)

| # | Punkt | Priorität |
|---|-------|-----------|
| 1 | Datenpersistenz (SQLite minimum) | Hoch |
| 2 | JWT-Authentifizierung + Rollen (user / admin / superadmin) | Hoch |
| 3 | Rate-Limiting gegen Brute-Force (Admin-Key) | Mittel |
| 4 | Content-Security-Policy Header gegen XSS | Mittel |
| 5 | HTTPS lokal (mkcert) für WebXR-Test ohne Meta Quest | Mittel |
| 6 | Input-Sanitisierung gegen Stored-XSS in Freitextfeldern | Mittel |
| 7 | Admin-Key nach Plan: JWT + Rollen ersetzen | Hoch |

---

## Für Production-Deployment erforderlich

1. **HTTPS erzwingen** (WebXR-Pflicht, Let's Encrypt)
2. **Authentifizierung** (JWT + Rollen: Admin / Inspektor) — DSGVO-konform, kein Google/Meta OAuth
3. **Rate-Limiting** gegen Brute-Force und DDoS
4. **Content-Security-Policy Header** gegen XSS
5. **Datenpersistenz** (SQLite minimum, Backup-Strategie)
6. **Umgebungsvariablen** nie im Code hardcoden (`.env` nie committen)
7. **ISDS-Compliance** Kanton Zürich — Daten in CH oder EU

---

## Sicherheitsregeln für Entwicklung

- Keine echten Daten (Fotos, Personendaten) in Mock-Daten
- `.env` und `.env.local` niemals committen (steht in `.gitignore`)
- `npm audit` vor jedem Release ausführen (`npm run audit`)
- Dependabot auf GitHub aktiviert
- Admin-Key in `.env.local` — NICHT `.env.example`-Wert verwenden

---

## Verantwortlich

**Stevo**, Fachstelle Verkehrssicherheit, Tiefbauamt, Kanton Zürich
Sicherheitsfragen: via GitHub Issues (privat) oder direkt.
