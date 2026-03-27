import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/index";   // i18n vor App initialisieren
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root-Element #root nicht gefunden");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
