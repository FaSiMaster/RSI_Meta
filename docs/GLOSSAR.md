# Glossar – RSI VR Tool

Fachbegriffe, Abkürzungen und technische Konzepte des Projekts.

---

## RSI-Fachbegriffe

| Begriff | Ausschreibung | Bedeutung |
|---------|--------------|-----------|
| **RSI** | Road Safety Inspection | Systematische Überprüfung von Strassenabschnitten auf Sicherheitsdefizite nach einer standardisierten Methodik |
| **SD** | Sicherheitsdefizit | Abweichung vom Soll-Zustand, die das Unfallrisiko erhöht |
| **io** | innerorts | Strassenabschnitt innerhalb der Ortschaft (Tempolimit i.d.R. 50 km/h) |
| **ao** | ausserorts | Strassenabschnitt ausserhalb der Ortschaft |
| **NACA** | National Advisory Committee for Aeronautics | In der RSI-Methodik verwendete Skala zur Beurteilung der Unfallschwere (leicht / mittel / schwer) |
| **Wichtigkeit** | – | RSI-Kriterium: Wie wichtig ist das geprüfte Merkmal für die Strassensicherheit an diesem Standort (gross / mittel / klein)? |
| **Abweichung** | – | RSI-Kriterium: Wie stark weicht der Ist-Zustand von der Norm oder Soll-Vorgabe ab (gross / mittel / klein)? |
| **Relevanz SD** | Relevanz Sicherheitsdefizit | Ergebnis aus Wichtigkeit × Abweichung (hoch / mittel / gering) |
| **Unfallrisiko** | – | Endresultat aus Relevanz SD × NACA-Unfallschwere (hoch / mittel / gering) |
| **Hotspot** | – | Markierter Punkt in der 360°-Szene, der ein Sicherheitsdefizit repräsentiert |
| **Tolerance** | – | Klick-Radius in 3D-Welteinheiten, innerhalb dem ein Hotspot als angeklickt gilt |

---

## Institutionen & Abkürzungen

| Abkürzung | Ausschreibung |
|-----------|--------------|
| **FaSi** | Fachstelle Verkehrssicherheit |
| **TBA** | Tiefbauamt, Kanton Zürich |
| **KZH** | Kanton Zürich |
| **bfu** | Beratungsstelle für Unfallverhütung |
| **ASTRA** | Bundesamt für Strassen |
| **SN** | Schweizer Norm (VSS) |
| **VSS** | Vereinigung Schweizerischer Strassenfachleute |

---

## Technische Abkürzungen – Frontend

| Abkürzung | Ausschreibung | Bedeutung |
|-----------|--------------|-----------|
| **VR** | Virtual Reality | Vollständig computererzeugte immersive Umgebung |
| **AR** | Augmented Reality | Überlagerung der realen Welt mit digitalen Inhalten |
| **XR** | Extended Reality | Oberbegriff für VR, AR und MR |
| **MR** | Mixed Reality | Kombination aus realer und virtueller Welt |
| **WebXR** | Web Extended Reality | Browser-API für immersive VR/AR-Erlebnisse ohne App-Installation |
| **PWA** | Progressive Web App | Webseite, die sich wie eine native App installieren und nutzen lässt |
| **TWA** | Trusted Web Activity | Android-Wrapper für PWAs im Google Play Store / Meta Horizon Store |
| **R3F** | React Three Fiber | Deklarative React-Bibliothek für Three.js |
| **HMR** | Hot Module Replacement | Live-Update des Browsers während der Entwicklung ohne Neuladen |
| **HTTPS** | Hypertext Transfer Protocol Secure | Verschlüsselte HTTP-Verbindung; Pflicht für WebXR |
| **HSTS** | HTTP Strict Transport Security | Browser-Header, der HTTPS erzwingt |
| **CORS** | Cross-Origin Resource Sharing | Browser-Sicherheitsmechanismus für domainübergreifende Requests |
| **CSP** | Content Security Policy | HTTP-Header zur Prävention von XSS-Angriffen |
| **XSS** | Cross-Site Scripting | Angriff durch eingeschleuster JavaScript-Code |
| **JWT** | JSON Web Token | Standard für sichere Authentifizierungstoken |
| **SPA** | Single Page Application | Webanwendung, die ohne Seitenneuladen navigiert |
| **DOM** | Document Object Model | Baum-Struktur einer HTML-Seite |
| **API** | Application Programming Interface | Schnittstelle zur Kommunikation zwischen Systemen |
| **REST** | Representational State Transfer | Architekturstil für Web-APIs |
| **ESM** | ES Modules | Modernes JavaScript-Modulsystem |
| **SSR** | Server Side Rendering | HTML-Rendering auf dem Server |
| **CSR** | Client Side Rendering | HTML-Rendering im Browser |

---

## Technische Abkürzungen – 3D / WebXR

| Abkürzung | Ausschreibung | Bedeutung |
|-----------|--------------|-----------|
| **R3F** | React Three Fiber | Deklarativer Wrapper für Three.js in React |
| **drei** | – | Utility-Bibliothek für R3F (OrbitControls, Html, useTexture, …) |
| **HDR/HDRI** | High Dynamic Range Image | 360°-Panoramabild mit hohem Dynamikumfang |
| **ERP** | Equirectangular Projection | Standard-Projektion für 360°-Fotos (2:1 Seitenverhältnis) |
| **FOV** | Field of View | Sichtfeld der Kamera in Grad |
| **FPS** | Frames Per Second | Bildrate; Meta Quest 3 Ziel: 90 FPS |
| **DoF** | Depth of Field | Tiefenschärfe |
| **UV** | UV-Koordinaten | 2D-Mapping-Koordinaten auf 3D-Oberflächen |
| **WASM** | WebAssembly | Binäres Kompilat für hohe Performance im Browser |
| **GPU** | Graphics Processing Unit | Grafikkarte für 3D-Rendering |
| **XRSession** | – | WebXR-Objekt, das eine aktive VR/AR-Sitzung repräsentiert |
| **XROrigin** | – | @react-three/xr Komponente, setzt VR-Startposition des Spielers |
| **XRStore** | – | Zustandsspeicher für WebXR-Session (`createXRStore()`) |

---

## Technische Abkürzungen – Tools & Stack

| Kürzel | Bedeutung |
|--------|-----------|
| **Vite** | Build-Tool und Dev-Server (Aussprache: «Veet») |
| **TSX** | TypeScript + JSX (React-Komponenten-Format) |
| **TS** | TypeScript |
| **JS** | JavaScript |
| **ESLint** | JavaScript/TypeScript Linting-Tool |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **GH** | GitHub |
| **GH Pages** | GitHub Pages – kostenfreies Static Hosting |
| **npm** | Node Package Manager |
| **QS** | Qualitätssicherung |
| **QA** | Quality Assurance (englisch für QS) |
| **SemVer** | Semantic Versioning (MAJOR.MINOR.PATCH) |

---

## Schweizer Zahlenformat (Projektstandard)

| Format | Beispiel |
|--------|---------|
| Tausendertrennzeichen | `1'234'567` (Apostroph) |
| Dezimaltrennzeichen | `1'234,50` (Komma) |
| Prozent | `12,5 %` (Leerzeichen vor %) |
| Datum | `27.03.2026` |
| Uhrzeit | `14:30 Uhr` |
