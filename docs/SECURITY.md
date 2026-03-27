# Sicherheitshinweise – RSI VR Tool

---

## Aktueller Status (Phase 1 / Prototyp)

**Diese Applikation ist ein lokaler Entwicklungsprototyp.**
Sie ist NICHT für den öffentlichen Produktionseinsatz geeignet.

---

## Bekannte Sicherheitslücken (Phase 1, bewusst akzeptiert)

| # | Lücke | Risiko | Fix in Phase |
|---|-------|--------|-------------|
| 1 | Admin-API ohne Authentifizierung | Hoch | Phase 2 |
| 2 | Keine Input-Validierung auf API-Endpunkten | Hoch | Phase 2 |
| 3 | In-Memory-Daten (kein Datenverlustschutz) | Mittel | Phase 2 |
| 4 | CORS nicht konfiguriert | Mittel | Phase 2 |
| 5 | fetch-Calls ohne Error-Handling | Mittel | Phase 2 |
| 6 | Kein globaler Express Error-Handler | Mittel | Phase 2 |

---

## Für Production-Deployment erforderlich

1. **HTTPS erzwingen** (WebXR-Pflicht, Let's Encrypt)
2. **Authentifizierung** (JWT + Rollen: Admin / Inspektor)
3. **Input-Validierung** mit zod auf allen API-Routes
4. **CORS-Konfiguration** mit erlaubter Domain-Whitelist
5. **Content-Security-Policy Header** gegen XSS
6. **Rate-Limiting** gegen Brute-Force und DDoS
7. **Datenpersistenz** (SQLite minimum)
8. **Umgebungsvariablen** nie im Code hardcoden

---

## Sicherheitsregeln für Entwicklung

- Keine echten Daten (Fotos, Personendaten) in Mock-Daten
- `.env` niemals committen (steht in `.gitignore`)
- `npm audit` vor jedem Release ausführen
- Dependabot auf GitHub aktivieren

---

## Verantwortlich

**Stevo**, Fachstelle Verkehrssicherheit, Tiefbauamt, Kanton Zürich
Sicherheitsfragen: via GitHub Issues (privat) oder direkt.
