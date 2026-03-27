# Changelog – RSI VR Tool

Alle relevanten Änderungen werden hier dokumentiert.
Format: [Semantic Versioning](https://semver.org/) · `MAJOR.MINOR.PATCH`

---

## [0.1.1] – 2026-03-27

### Behoben
- `SceneViewer.tsx`: `isPresenting`-Bug gefixt — @react-three/xr v6 API nutzt `state.session !== null` statt `state.isPresenting`. OrbitControls werden jetzt korrekt in VR deaktiviert.

---

## [0.1.0] – 2026-03-27 · *Phase 1 – Basis-Setup*

### Neu
- Projektstruktur: React 19 + Vite 6 + TypeScript 5.8
- 3D-Rendering: `@react-three/fiber` v9, `@react-three/drei` v10
- WebXR-Integration: `@react-three/xr` v6 mit `createXRStore`, `<XR>`, `XROrigin`
- 360°-Szene: Invertierte Sphere (`SceneSphere`) mit equirektangularen Texturen
- Deficit-Hotspot-System: 3D-Marker mit Distanz-basierter Klickerkennung
- RSI-Bewertungsmatrix: Wichtigkeit × Abweichung → Relevanz SD → × NACA → Unfallrisiko
- Hint-System mit Score-Penalty (−250 Punkte)
- Admin-CMS: Themenbereiche, Szenen, Defizit-Katalog verwalten
- Leaderboard / Globales Ranking
- Onboarding mit Username-Eingabe
- Desktop-Controls: OrbitControls (deaktiviert in VR)
- Express.js Backend mit In-Memory-Daten (Phase 1)
- PWA-Manifest konfiguriert (Bubblewrap-ready)
- Tailwind CSS v4 + Inter / Playfair Display Typografie
- Dark/Light Theme Toggle

### Bekannte Einschränkungen (Phase 1)
- Controller-Input in VR nicht implementiert (Phase 2)
- In-Memory-Backend: Daten gehen bei Server-Neustart verloren
- Admin-API ohne Authentifizierung (Phase 2)
- PWA-Icons noch nicht erstellt
- HTTPS nur via externem Proxy (Vercel, Nginx)

---

## Roadmap

| Version | Inhalt | Status |
|---------|--------|--------|
| 0.1.x | Bug-Fixes Phase 1 | Aktiv |
| 0.2.0 | Phase 2: Controller-Raycast, Teleportation, echte 360°-Bilder | Geplant |
| 0.3.0 | Phase 3: Mangelmarkierung in VR, Floating UI Panels | Geplant |
| 0.4.0 | Phase 4: PDF-Export, Session-Review | Geplant |
| 1.0.0 | Phase 5: Meta Horizon Store Release | Geplant |
