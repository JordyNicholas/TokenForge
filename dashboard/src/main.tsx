/**
 * Tokens Saved (Prove adapter).
 *
 *   domain/  pure scenario math + JSON parse (no React)
 *   data/    fetch / File adapters for the Token Risk JSON port
 *   state/   React provider
 *   theme/   Material Design light/dark + style palettes
 *   ui/      shared layout and widgets
 *   pages/   one route each
 */
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DashboardProvider } from "./state/DashboardProvider";
import { ThemeAppProvider } from "./theme/ThemeAppProvider";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeAppProvider>
        <DashboardProvider>
          <App />
        </DashboardProvider>
      </ThemeAppProvider>
    </BrowserRouter>
  </StrictMode>,
);
