/**
 * Tokens Saved (Prove adapter).
 *
 *   domain/  pure scenario math + JSON parse (no React)
 *   data/    fetch / File adapters for the Token Risk JSON port
 *   state/   React provider
 *   ui/      shared layout and widgets
 *   pages/   one route each
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DashboardProvider } from "./state/DashboardProvider";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <DashboardProvider>
        <App />
      </DashboardProvider>
    </BrowserRouter>
  </StrictMode>,
);
