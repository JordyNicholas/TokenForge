// First E2E spec: "view the dashboard".
// Boots the real SPA (served by `npm run dev -w @tokenforge/dashboard`), waits
// past the demo-seed spinner, and asserts the Overview board renders + navigates.

describe("Dashboard · Overview", () => {
  describe("with the bundled demo seed", () => {
    beforeEach(() => {
      // "/" redirects to "/board/combined"; wait past the "Loading demo seed…" spinner.
      cy.loadDemoDashboard("/");
    });

    it("redirects to the combined board and renders the shell + KPIs", () => {
      cy.location("pathname").should("eq", "/board/combined");

      // App shell. The side nav is a fixed, scrollable drawer, so its links may
      // sit below the fold — assert they exist, not that they're in view.
      cy.contains("TokenForge").should("be.visible");
      cy.get('nav[aria-label="FinOps views"]').within(() => {
        cy.contains("Overview").should("exist");
        cy.contains("Findings").should("exist");
        cy.contains("Assumptions").should("exist");
      });

      // Page title is "<business unit> · <scope>"
      cy.get("h1").should("contain.text", "·");

      // Overview KPI cards
      cy.contains("Tokens saved").should("be.visible");
      cy.contains("$ saved / month").should("be.visible");
      cy.contains("Scenario savings").should("be.visible");

      // Teams table
      cy.contains(/Teams in this business unit|Team detail/).should("exist");
    });

    it("navigates Overview → Findings from the side nav", () => {
      // The nav link is a RouterLink <a> inside the fixed drawer; force past the
      // overflow clip rather than depending on it being scrolled into view.
      cy.get('nav[aria-label="FinOps views"]')
        .contains("a", "Findings")
        .click({ force: true });
      cy.location("pathname").should("include", "/findings");
    });

    it("switches the scan board to Heuristic", () => {
      cy.get('[aria-label="Scan board"]').contains("Heuristic").click();
      cy.location("pathname").should("include", "/board/heuristic");
    });
  });

  describe("with a stubbed seed (deterministic)", () => {
    beforeEach(() => {
      cy.intercept("GET", "/demo-seed.json", { fixture: "seed-min.json" }).as("seed");
      cy.visit("/");
      cy.wait("@seed");
      cy.contains("Loading demo seed…").should("not.exist");
    });

    it("renders the business unit and both teams from the fixture", () => {
      cy.get("h1").should("contain.text", "Retail Banking (test seed)");
      cy.contains("payments-platform").should("be.visible");
      cy.contains("checkout").should("be.visible");
    });
  });
});
