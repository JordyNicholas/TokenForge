import { defineConfig } from "cypress";

// One config for both runners. `cypress open` lets you pick E2E or Component;
// `cypress run --e2e` / `--component` pick one on the CLI.
export default defineConfig({
  e2e: {
    // `npm run dev -w @tokenforge/dashboard` serves the SPA here (Vite default).
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
  },
  component: {
    // Reuses dashboard/vite.config.ts (react plugin, @tokenforge/risk-core resolve).
    devServer: { framework: "react", bundler: "vite" },
    specPattern: "cypress/component/**/*.cy.tsx",
    supportFile: "cypress/support/component.tsx",
  },
});
