import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock-Datenbank (In-Memory)
  let topics = [
    { id: "fuss", name: "Fussverkehr", description: "Sicherheitsdefizite bei Gehwegen und Querungen." },
    { id: "velo", name: "Veloverkehr", description: "Radwege, Radstreifen und Knotenpunkte." },
    { id: "knoten", name: "Knotenpunkte", description: "Sichtweiten und Vorfahrtsregelungen." },
    { id: "baustelle", name: "Baustellen", description: "Absicherung und Verkehrsführung." },
  ];

  let scenes = [
    { 
      id: "scene1", 
      topicId: "fuss", 
      imageUrl: "https://picsum.photos/seed/street1/4096/2048", 
      description: "Innerörtliche Strasse mit Gehweg.",
      locationType: "io"
    },
    { 
      id: "scene2", 
      topicId: "velo", 
      imageUrl: "https://picsum.photos/seed/street2/4096/2048", 
      description: "Hauptverkehrsstrasse mit Radstreifen.",
      locationType: "ao"
    }
  ];

  let deficits = [
    { 
      id: "def1", 
      sceneId: "scene1", 
      position: [10, 0, -10], 
      tolerance: 2.5,
      title: "Fehlende Absenkung", 
      description: "Der Bordstein ist an der Querungsstelle nicht abgesenkt.", 
      correctAssessment: {
        wichtigkeit: "mittel",
        abweichung: "gross",
        unfallschwere: "mittel"
      },
      feedback: "Barrierefreiheit ist nicht gegeben. Rollstuhlfahrer müssen auf die Fahrbahn ausweichen.", 
      solution: "Bordstein auf 0-3cm absenken." 
    },
    { 
      id: "def2", 
      sceneId: "scene1", 
      position: [-5, 2, -8], 
      tolerance: 2.0,
      title: "Sichtbehinderung", 
      description: "Hecke ragt in den Sichtraum der Fussgänger.", 
      correctAssessment: {
        wichtigkeit: "gross",
        abweichung: "mittel",
        unfallschwere: "schwer"
      },
      feedback: "Gefahr durch herannahende Fahrzeuge wird zu spät erkannt.", 
      solution: "Rückschnitt der Bepflanzung anordnen." 
    }
  ];

  let rankings = [
    { username: "Max Muster", score: 1250, timestamp: new Date().toISOString() },
    { username: "SicherheitsPro", score: 980, timestamp: new Date().toISOString() },
    { username: "RSI_Expert", score: 1500, timestamp: new Date().toISOString() },
  ];

  // API Endpunkte
  app.get("/api/topics", (req, res) => res.json(topics));
  app.get("/api/scenes/:topicId", (req, res) => {
    const filtered = scenes.filter(s => s.topicId === req.params.topicId);
    res.json(filtered);
  });
  app.get("/api/deficits/:sceneId", (req, res) => {
    const filtered = deficits.filter(d => d.sceneId === req.params.sceneId);
    res.json(filtered);
  });
  app.get("/api/rankings", (req, res) => {
    res.json(rankings.sort((a, b) => b.score - a.score));
  });
  app.post("/api/rankings", (req, res) => {
    const { username, score } = req.body;
    rankings.push({ username, score, timestamp: new Date().toISOString() });
    res.json({ success: true });
  });

  // Admin API (CMS)
  app.post("/api/admin/scenes", (req, res) => {
    const newScene = { ...req.body, id: `scene${Date.now()}` };
    scenes.push(newScene);
    res.json(newScene);
  });

  app.post("/api/admin/deficits", (req, res) => {
    const newDeficit = { ...req.body, id: `def${Date.now()}` };
    deficits.push(newDeficit);
    res.json(newDeficit);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
