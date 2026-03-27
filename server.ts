import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { z, ZodError } from "zod";

// ── Zod-Schemas ───────────────────────────────────────────────────────────────

const I18nStringSchema = z.object({
  de: z.string().min(1).max(500),
  fr: z.string().max(500).optional(),
  en: z.string().max(500).optional(),
  it: z.string().max(500).optional(),
});

const RankingSchema = z.object({
  username:        z.string().min(1).max(50),
  score:           z.number().int().min(0).max(999_999),
  scope:           z.enum(["topic", "total", "course"]).default("total"),
  scopeId:         z.string().min(1).max(50).default("total"),
  completedScenes: z.number().int().min(0).max(999).default(0),
});

const SceneSchema = z.object({
  topicId:     z.string().min(1).max(50),
  imageUrl:    z.string().url(),
  description: z.string().min(1).max(500),
  locationType: z.enum(["io", "ao"]),
  difficulty:  z.enum(["leicht", "mittel", "schwer"]).optional(),
});

const DeficitZoneSchema = z.object({
  type:        z.enum(["point", "polygon"]),
  coordinates: z.array(z.array(z.number())).min(1),
  position3d:  z.tuple([z.number(), z.number(), z.number()]).optional(),
}).optional();

const DeficitReferenceSchema = z.object({
  label:    z.string().min(1).max(200),
  url:      z.string().url().optional(),
  normCode: z.string().max(50).optional(),
});

const DeficitSchema = z.object({
  sceneId:      z.string().min(1).max(50),
  position:     z.tuple([z.number(), z.number(), z.number()]),
  tolerance:    z.number().positive().max(20),
  title:        z.string().min(1).max(100),
  description:  z.string().min(1).max(1_000),
  categoryId:   z.string().max(50).optional(),
  correctAssessment: z.object({
    wichtigkeit:   z.enum(["gross", "mittel", "klein"]),
    abweichung:    z.enum(["gross", "mittel", "klein"]),
    unfallschwere: z.enum(["schwer", "mittel", "leicht"]),
  }),
  feedback:    z.string().min(1).max(1_000),
  solution:    z.string().min(1).max(1_000),
  zone:        DeficitZoneSchema,
  references:  z.array(DeficitReferenceSchema).max(10).optional(),
  isMandatory: z.boolean().optional(),
  isBooster:   z.boolean().optional(),
});

const DeficitUpdateSchema = DeficitSchema.partial();

const TopicSchema = z.object({
  name:        z.string().min(1).max(100),
  nameI18n:    I18nStringSchema.optional(),
  description: z.string().min(1).max(500),
  descriptionI18n: I18nStringSchema.optional(),
  icon:        z.string().max(50).optional(),
  parentTopicId: z.string().max(50).optional(),
  order:       z.number().int().min(0).optional(),
});

const TopicUpdateSchema = TopicSchema.partial();

const CourseSchema = z.object({
  name:       z.string().min(1).max(100),
  date:       z.string().min(1).max(30),
  accessCode: z.string().min(3).max(30),
  topicIds:   z.array(z.string()).min(1),
  active:     z.boolean().default(true),
});

const GlossarySchema = z.object({
  term:           z.string().min(1).max(100),
  definition:     z.string().min(1).max(2_000),
  termI18n:       I18nStringSchema.optional(),
  definitionI18n: I18nStringSchema.optional(),
  sourceNorm:     z.string().max(100).optional(),
});

const CategorySchema = z.object({
  nameI18n: I18nStringSchema,
  icon:     z.string().max(50).optional(),
  color:    z.string().max(20).optional(),
});

// ── Admin-Auth Middleware ──────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key      = req.headers["x-admin-key"] as string | undefined;
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
  const app  = express();
  const PORT = 3000;

  // ── Middleware ───────────────────────────────────────────────────────────────

  app.use(cors({
    origin: process.env.NODE_ENV === "production"
      ? process.env.ALLOWED_ORIGIN || false
      : ["http://localhost:3000", "http://localhost:5173", /^http:\/\/192\.168\./],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-Admin-Key"],
  }));

  app.use(express.json({ limit: "200kb" }));

  // ── In-Memory-Datenbank (Phase 1) ─────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let topics: any[] = [
    { id: "fuss",      name: "Fussverkehr",  nameI18n: { de: "Fussverkehr",  fr: "Circulation piétonne" }, description: "Sicherheitsdefizite bei Gehwegen und Querungen.", icon: "Footprints", order: 0, archived: false },
    { id: "velo",      name: "Veloverkehr",  nameI18n: { de: "Veloverkehr",  fr: "Circulation cycliste" }, description: "Radwege, Radstreifen und Knotenpunkte.",           icon: "Bike",       order: 1, archived: false },
    { id: "knoten",    name: "Knotenpunkte", nameI18n: { de: "Knotenpunkte", fr: "Carrefours" },           description: "Sichtweiten und Vorfahrtsregelungen.",             icon: "GitMerge",   order: 2, archived: false },
    { id: "baustelle", name: "Baustellen",   nameI18n: { de: "Baustellen",   fr: "Chantiers" },            description: "Absicherung und Verkehrsführung.",                 icon: "HardHat",    order: 3, archived: false },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let scenes: any[] = [
    { id: "scene1", topicId: "fuss", imageUrl: "https://picsum.photos/seed/street1/4096/2048", description: "Innerörtliche Strasse mit Gehweg.", locationType: "io", difficulty: "mittel" },
    { id: "scene2", topicId: "velo", imageUrl: "https://picsum.photos/seed/street2/4096/2048", description: "Hauptverkehrsstrasse mit Radstreifen.", locationType: "ao", difficulty: "schwer" },
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
      isMandatory: true,
      isBooster: false,
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
      isMandatory: false,
      isBooster: true,
      references: [{ label: "VSS Norm 40 070", normCode: "VSS 40 070" }],
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rankings: any[] = [
    { username: "Max Muster",    scope: "total" as const, scopeId: "total", score: 1250, completedScenes: 3, timestamp: new Date().toISOString() },
    { username: "SicherheitsPro", scope: "total" as const, scopeId: "total", score: 980,  completedScenes: 2, timestamp: new Date().toISOString() },
    { username: "RSI_Expert",    scope: "total" as const, scopeId: "total", score: 1500, completedScenes: 5, timestamp: new Date().toISOString() },
    { username: "RSI_Expert",    scope: "topic" as const, scopeId: "fuss",  score: 750,  completedScenes: 2, timestamp: new Date().toISOString() },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let courses: any[] = [
    { id: "kurs1", name: "FaSi-Workshop 2026", date: "2026-04-15", accessCode: "FASI-2026-A", topicIds: ["fuss", "velo"], participantIds: [], createdAt: new Date().toISOString(), active: true },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let glossary: any[] = [
    { id: "g1", term: "RSI",               definition: "Road Safety Inspection – strukturierte Sicherheitsbegehung von Strassen.",       sourceNorm: "VSS 40 886" },
    { id: "g2", term: "ISSI",              definition: "Inspection de Sécurité des Routes et des Infrastructures (franz. Entsprechung RSI).", sourceNorm: "VSS 40 886" },
    { id: "g3", term: "Sicherheitsdefizit", definition: "Abweichung des Ist-Zustands von einer anerkannten Norm oder Sicherheitsregel.",   sourceNorm: "" },
    { id: "g4", term: "NACA",              definition: "National Advisory Committee for Aeronautics Score – Mass für Unfallschwere.",       sourceNorm: "" },
    { id: "g5", term: "SD",                definition: "Sicherheitsdefizit (Abkürzung im RSI-Kontext).",                                   sourceNorm: "" },
    { id: "g6", term: "io",                definition: "innerorts – Strassen innerhalb geschlossener Ortschaften (V ≤ 50 km/h).",          sourceNorm: "SVG Art. 4a" },
    { id: "g7", term: "ao",                definition: "ausserorts – Strassen ausserhalb geschlossener Ortschaften.",                       sourceNorm: "SVG Art. 4a" },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let categories: any[] = [
    { id: "cat1", nameI18n: { de: "Sichtweite",        fr: "Visibilité" },        icon: "Eye" },
    { id: "cat2", nameI18n: { de: "Markierung",         fr: "Marquage" },          icon: "PenLine" },
    { id: "cat3", nameI18n: { de: "Signalisation",      fr: "Signalisation" },     icon: "TriangleAlert" },
    { id: "cat4", nameI18n: { de: "Querungssituation",  fr: "Traversée" },         icon: "Footprints" },
    { id: "cat5", nameI18n: { de: "Beleuchtung",        fr: "Éclairage" },         icon: "Lightbulb" },
    { id: "cat6", nameI18n: { de: "Strassenoberfläche", fr: "Revêtement" },        icon: "Layers" },
  ];

  // ── Öffentliche Endpunkte ─────────────────────────────────────────────────────

  // Topics
  app.get("/api/topics", (_req, res) => {
    res.json(topics.filter(t => !t.archived));
  });

  // Scenes by topicId
  app.get("/api/scenes/:topicId", (req, res) => {
    const topicId = req.params.topicId.slice(0, 50);
    res.json(scenes.filter(s => s.topicId === topicId));
  });

  // Deficits by sceneId
  app.get("/api/deficits/:sceneId", (req, res) => {
    const sceneId = req.params.sceneId.slice(0, 50);
    res.json(deficits.filter(d => d.sceneId === sceneId));
  });

  // Rankings: GET /api/rankings/:scope/:scopeId
  app.get("/api/rankings/:scope/:scopeId", (req, res) => {
    const { scope, scopeId } = req.params;
    if (!["topic", "total", "course"].includes(scope)) {
      res.status(400).json({ error: "Ungültiger Scope" });
      return;
    }
    const filtered = rankings
      .filter(r => r.scope === scope && r.scopeId === scopeId)
      .sort((a, b) => b.score - a.score);
    res.json(filtered);
  });

  // Rankings: Legacy GET /api/rankings (total scope, für Backwards-Compat)
  app.get("/api/rankings", (_req, res) => {
    res.json(rankings.filter(r => r.scope === "total").sort((a, b) => b.score - a.score));
  });

  // Rankings: POST
  app.post("/api/rankings", (req, res) => {
    const result = RankingSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    rankings.push({ ...result.data, timestamp: new Date().toISOString() });
    res.status(201).json({ success: true });
  });

  // Courses: GET
  app.get("/api/courses", (_req, res) => {
    res.json(courses);
  });

  // Glossary: GET
  app.get("/api/glossary", (_req, res) => {
    res.json(glossary);
  });

  // Categories: GET
  app.get("/api/categories", (_req, res) => {
    res.json(categories);
  });

  // ── Admin-Endpunkte ───────────────────────────────────────────────────────────

  // Topics CRUD
  app.post("/api/admin/topics", requireAdmin, (req, res) => {
    const result = TopicSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const newTopic = { ...result.data, id: `topic${Date.now()}`, archived: false, order: topics.length };
    topics.push(newTopic);
    res.status(201).json(newTopic);
  });

  app.put("/api/admin/topics/:id", requireAdmin, (req, res) => {
    const result = TopicUpdateSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const idx = topics.findIndex(t => t.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Thema nicht gefunden" }); return; }
    topics[idx] = { ...topics[idx], ...result.data };
    res.json(topics[idx]);
  });

  app.patch("/api/admin/topics/:id/archive", requireAdmin, (req, res) => {
    const idx = topics.findIndex(t => t.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Thema nicht gefunden" }); return; }
    topics[idx] = { ...topics[idx], archived: true };
    res.json({ success: true });
  });

  // Scenes CRUD
  app.post("/api/admin/scenes", requireAdmin, (req, res) => {
    const result = SceneSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const newScene = { ...result.data, id: `scene${Date.now()}` };
    scenes.push(newScene);
    res.status(201).json(newScene);
  });

  // Deficits CRUD
  app.post("/api/admin/deficits", requireAdmin, (req, res) => {
    const result = DeficitSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const newDeficit = { ...result.data, id: `def${Date.now()}` };
    deficits.push(newDeficit as typeof deficits[0]);
    res.status(201).json(newDeficit);
  });

  app.put("/api/admin/deficits/:id", requireAdmin, (req, res) => {
    const result = DeficitUpdateSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const idx = deficits.findIndex(d => d.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Defizit nicht gefunden" }); return; }
    deficits[idx] = { ...deficits[idx], ...result.data } as typeof deficits[0];
    res.json(deficits[idx]);
  });

  app.delete("/api/admin/deficits/:id", requireAdmin, (req, res) => {
    const before = deficits.length;
    deficits = deficits.filter(d => d.id !== req.params.id);
    if (deficits.length === before) { res.status(404).json({ error: "Defizit nicht gefunden" }); return; }
    res.json({ success: true });
  });

  // Courses CRUD
  app.post("/api/admin/courses", requireAdmin, (req, res) => {
    const result = CourseSchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const newCourse = {
      ...result.data,
      id: `course${Date.now()}`,
      participantIds: [],
      createdAt: new Date().toISOString(),
    };
    courses.push(newCourse);
    res.status(201).json(newCourse);
  });

  app.put("/api/admin/courses/:id", requireAdmin, (req, res) => {
    const result = CourseSchema.partial().safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const idx = courses.findIndex(c => c.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Kurs nicht gefunden" }); return; }
    courses[idx] = { ...courses[idx], ...result.data };
    res.json(courses[idx]);
  });

  // Glossary CRUD
  app.post("/api/admin/glossary", requireAdmin, (req, res) => {
    const result = GlossarySchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const newEntry = { ...result.data, id: `g${Date.now()}` };
    glossary.push(newEntry);
    res.status(201).json(newEntry);
  });

  app.put("/api/admin/glossary/:id", requireAdmin, (req, res) => {
    const result = GlossarySchema.partial().safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const idx = glossary.findIndex(g => g.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Glossar-Eintrag nicht gefunden" }); return; }
    glossary[idx] = { ...glossary[idx], ...result.data };
    res.json(glossary[idx]);
  });

  app.delete("/api/admin/glossary/:id", requireAdmin, (req, res) => {
    const before = glossary.length;
    glossary = glossary.filter(g => g.id !== req.params.id);
    if (glossary.length === before) { res.status(404).json({ error: "Eintrag nicht gefunden" }); return; }
    res.json({ success: true });
  });

  // Categories CRUD
  app.post("/api/admin/categories", requireAdmin, (req, res) => {
    const result = CategorySchema.safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const newCat = { ...result.data, id: `cat${Date.now()}` };
    categories.push(newCat);
    res.status(201).json(newCat);
  });

  app.put("/api/admin/categories/:id", requireAdmin, (req, res) => {
    const result = CategorySchema.partial().safeParse(req.body);
    if (!result.success) { zodError(res, result.error); return; }
    const idx = categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: "Kategorie nicht gefunden" }); return; }
    categories[idx] = { ...categories[idx], ...result.data };
    res.json(categories[idx]);
  });

  app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
    const before = categories.length;
    categories = categories.filter(c => c.id !== req.params.id);
    if (categories.length === before) { res.status(404).json({ error: "Kategorie nicht gefunden" }); return; }
    res.json({ success: true });
  });

  // ── Vite Dev-Middleware / Static Prod ─────────────────────────────────────────

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

  // ── Globaler Error-Handler ─────────────────────────────────────────────────────

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[ERROR]", err.stack ?? err.message);
    res.status(500).json({ error: "Interner Serverfehler" });
  });

  // ── Server starten ────────────────────────────────────────────────────────────

  app.listen(PORT, "0.0.0.0", () => {
    const adminKeySet = !!process.env.ADMIN_KEY;
    console.log(`\nRSI VR Tool  →  http://localhost:${PORT}`);
    console.log(`Meta Quest   →  http://[lokale-IP]:${PORT}`);
    console.log(`Admin-Key:      ${adminKeySet ? "gesetzt ✓" : "NICHT gesetzt ⚠"}`);
    console.log(`Umgebung:       ${process.env.NODE_ENV ?? "development"}\n`);
  });
}

startServer();
