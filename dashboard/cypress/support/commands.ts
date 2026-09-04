/// <reference types="cypress" />

// Open the dashboard and wait for the demo seed fetch to resolve.
// Until it does, App.tsx renders a "Loading demo seed…" spinner, so every
// E2E spec must gate on that text disappearing before asserting content.
Cypress.Commands.add("loadDemoDashboard", (path: string = "/") => {
  cy.clearLocalStorage();
  cy.visit(path);
  cy.contains("Loading demo seed…").should("not.exist");
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Visit `path` (default "/") and wait past the demo-seed spinner. */
      loadDemoDashboard(path?: string): Chainable<void>;
    }
  }
}

export {};
