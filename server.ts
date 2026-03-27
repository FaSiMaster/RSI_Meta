import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { z, ZodError } from "zod";

// ── Zod-Schemas für Input-Validierung ────────────────────────────────────────

const RankingSchema = z.object({
  username: z.string().min(1, "Name erforderlich").max(50, "Name zu lang"),
  score: z.number().int("Score muss ganzzahlig sein").min(0).max(99_999),
});

const SceneSchema = z.object({
  topicId: z.string().min(1).max(50),
  imageUrl: z.string().url("Ungültige Bild-URL"),
  description: z.string().min(1).max(500),
  locationType: z.enum(["io", "ao"]),
});

const DeficitSchema = z.object({
  sceneId: z.string().min(1).max(50),
  position: z.tuple([z.number(), z.number(), z.number()]),
  tolerance: z.number().positive().max(20),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1_000),
  correctAssessment: z.object({
    wichtigkeit: z.enum(["gross", "mittel", "klein"]),
    abweichung: z.enum(["gross", "mittel", "klein"]),
    unfallschwere: z.enum(["schwer", "mittel", "leicht"]),
  }),
  feedback: z.string().min(1).max(1_000),
  solution: z.string().min(1).max(1_000),
});

// Für PUT: alle Felder optional
const DeficitUpdateSchema = DeficitSchema.partial();

// ── Admin-Auth Middleware ─────────────────────────────────────────────────────
// Phase 1: API-Key-basiert. Phase 2: JWT + Rollen.

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"] as string | undefined;
  const validKey = process.env.ADMIN_KEY;

  if (!validKey) {
    console.warn("[WARN] ADMIN_KEY nicht gesetzt – Admin-API deaktiviert");
    res.status(503).json({ error: "Admin-API nicht konfiguriert" });
    return;
  }
  if (!key || key !== validKey) {
    res.status(401).json({ error: "Nicht autorisiert – ungültiger Admin-Key" });
    return;
  }
  next();
}

// ── Zod-Fehler-Helfer ─────────────────────────────────────────────────────────

function zodError(res: Response, err: ZodError): void {
  const messages = err.errors.map(e => `${e.path.join(".")}: ${e.message}`);
  res.status(400).json({ error: "Ungültige Eingabe", details: messages });
}

// ── Server-Start ──────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ── Middleware ──────────────────────────────────────────────────────────────

  // CORS: im Dev alle Localhost-Ports erlaubt, in Prod nur konfigurierter Origin
  app.use(cors({
    origin: process.env.NODE_ENV === "production"
      ? process.env.ALLOWED_ORIGIN || false
      : ["http://localhost:3000", "http://localhost:5173", /^http:\/\/192\.168\./],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "X-Admin-Key"],
  }));

  app.use(express.json({ limit: "100kb" }));

  // ── Mock-Datenbank (In-Memory) – Phase 1 ───────────────────────────────────
  // Phase 2: JSON-Dateien oder SQLite

  const topics = [
    { id: "fuss",      name: "Fussverkehr",  description: "Sicherheitsdefizite bei Gehwegen und Querungen." },
    { id: "velo",      name: "Veloverkehr",  description: "Radwege, Radstreifen und Knotenpunkte." },
    { id: "knoten",    name: "Knotenpunkte", description: "Sichtweiten und Vorfahrtsregelungen." },
    { id: "baustelle", name: "Baustellen",   description: "Absicherung und Verkehrsführung." },
  ];

  let scenes = [
    { id: "scene1", topicId: "fuss", imageUrl: "https://picsum.photos/seed/street1/4096/2048", description: "Innerörtliche Strasse mit Gehweg.",          locationType: "io" },
    { id: "scene2", topicId: "velo", imageUrl: "https://picsum.photos/seed/street2/4096/2048", description: "Hauptverkehrsstrasse mit Radstreifen.",      locationType: "ao" },
  ];

  let deficits = [
    {
      id: "def1", sceneId: "scene1",
      position: [10, 0, -10] as [number, number, number],
      tolerance: 2.5,
      title: "Fehlende Absenkung",
      description: "Der Bordstein ist an der Querungsstelle nicht abgesenkt.",
      correctAssessment: { wichtigkeit: "mittel", abweichung: "gross", unfallschwere: "mittel" },
      feedback: "Barrierefreiheit ist nicht gegeben. Rollstuhlfahrer müssen auf die Fahrbahn ausweichen.",
      solution: "Bordstein auf 0–3 cm absenken.",
    },
    {
      id: "def2", sceneId: "scene1",
      position: [-5, 2, -8] as [number, number, number],
      tolerance: 2.0,
      title: "Sichtbehinderung",
      description: "Hecke ragt in den Sichtraum der Fussgänger.",
      correctAssessment: { wichtigkeit: "gross", abweichung: "mittel", unfallschwere: "schwer" },
      feedback: "Gefahr durch herannahende Fahrzeuge wird zu spät erkannt.",
      solution: "Rückschnitt der Bepflanzung anordnen.",
    },
  ];

  let rankings = [
    { username: "Max Muster",    score: 1250, timestamp: new Date().toISOString() },
    { username: "SicherheitsPro", score: 980,  timestamp: new Date().toISOString() },
    { username: "RSI_Expert",    score: 1500, timestamp: new Date().toISOString() },
  ];

  // ── Öffentliche API-Endpunkte ───────────────────────────────────────────────

  app.get("/api/topics", (_req, res) => {
    res.json(topics);
  });

  app.get("/api/scenes/:topicId", (req, res) => {
    const topicId = req.params.topicId.slice(0, 50); // Länge begrenzen
    res.json(scenes.filter(s => s.topicId === topicId));
  });

  app.get("/api/deficits/:sceneId", (req, res) => {
    const sceneId = req.params.sceneId.slice(0, 50);
    res.json(deficits.filter(d => d.sceneId === sceneId));
  });

  app.get("/api/rankings", (_req, res) => {
    res.json([...rankings].sort((a, b) => b.score - a.score));
  });

  app.post("/api/rankings", (req, res) => {
    const result = RankingSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }

    rankings.push({ ...result.data, timestamp: new Date().toISOString() });
    res.status(201).json({ success: true });
  });

  // ── Admin-API (geschützt mit requireAdmin) ──────────────────────────────────

  app.post("/api/admin/scenes", requireAdmin, (req, res) => {
    const result = SceneSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }

    const newScene = { ...result.data, id: `scene${Date.now()}` };
    scenes.push(newScene);
    res.status(201).json(newScene);
  });

  app.post("/api/admin/deficits", requireAdmin, (req, res) => {
    const result = DeficitSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }

    const newDeficit = { ...result.data, id: `def${Date.now()}` };
    deficits.push(newDeficit);
    res.status(201).json(newDeficit);
  });

  app.put("/api/admin/deficits/:id", requireAdmin, (req, res) => {
    const result = DeficitUpdateSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }

    const idx = deficits.findIndex(d => d.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Defizit nicht gefunden" }); return; }

    deficits[idx] = { ...deficits[idx], ...result.data };
    res.json(deficits[idx]);
  });

  // ── Vite Dev-Middleware / Static Prod ───────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ── Globaler Error-Handler (muss nach allen Routes stehen) ──────────────────

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[ERROR]", err.stack ?? err.message);
    res.status(500).json({ error: "Interner Serverfehler" });
  });

  // ── Server starten ──────────────────────────────────────────────────────────

  app.listen(PORT, "0.0.0.0", () => {
    const adminKeySet = !!process.env.ADMIN_KEY;
    console.log(`\nRSI VR Tool  →  http://localhost:${PORT}`);
    console.log(`Meta Quest   →  http://[lokale-IP]:${PORT}`);
    console.log(`Admin-Key:      ${adminKeySet ? "gesetzt ✓" : "NICHT gesetzt ⚠"}`);
    console.log(`Umgebung:       ${process.env.NODE_ENV ?? "development"}\n`);
  });
}

startServer();
