// Overview E2E: analytical hero + Glossary against the Vite SPA.

describe("Dashboard · Overview", () => {
  describe("with the bundled demo seed", () => {
    beforeEach(() => {
      cy.loadDemoDashboard("/");
    });

    it("redirects to the combined board and renders the shell + hero KPIs", () => {
      cy.location("pathname").should("eq", "/board/combined");

      cy.contains("TokenForge").should("be.visible");
      cy.get('nav[aria-label="FinOps views"]').within(() => {
        cy.contains("Overview").should("exist");
        cy.contains("Findings").should("exist");
        cy.contains("Assumptions").should("exist");
        cy.contains("Variance").should("exist");
        cy.contains("Glossary").should("exist");
      });

      cy.get("h1").should("contain.text", "·");

      cy.contains("h2", "Prove at a glance").should("be.visible");
      cy.contains("Live hygiene").should("be.visible");
      cy.contains("Scan tokens avoided").should("be.visible");
      cy.contains("Scenario $").should("be.visible");
      cy.contains("Bill reconcile").should("be.visible");
    });

    it("navigates Overview → Findings from the hero Scan tokens tile", () => {
      cy.contains("Scan tokens avoided").click();
      cy.location("pathname").should("include", "/findings");
    });

    it("navigates Overview → Assumptions from the hero Scenario $ tile", () => {
      cy.contains("Scenario $").click();
      cy.location("pathname").should("include", "/assumptions");
    });

    it("navigates Overview → Variance from the hero Bill reconcile tile", () => {
      cy.contains("Bill reconcile").click();
      cy.location("pathname").should("include", "/variance");
    });

    it("opens Glossary from the side nav", () => {
      cy.get('nav[aria-label="FinOps views"]')
        .contains("a", "Glossary")
        .click({ force: true });
      cy.location("pathname").should("include", "/glossary");
      cy.contains("h1", "Glossary").should("be.visible");
      cy.contains("Honest savings tiers").should("exist");
    });

    it("switches the scan board to Heuristic", () => {
      cy.get('[aria-label="Scan board"]').contains("Heuristic").click();
      cy.location("pathname").should("include", "/board/heuristic");
    });

    it("shows an empty state on the LLM board instead of zero charts", () => {
      cy.get('[aria-label="Scan board"]').contains("LLM").click();
      cy.location("pathname").should("include", "/board/llm");
      cy.contains("No savings on this board").should("be.visible");
    });
  });

  describe("with a stubbed seed (deterministic)", () => {
    beforeEach(() => {
      cy.intercept("GET", "/demo-seed.json", { fixture: "seed-min.json" }).as("seed");
      cy.clearLocalStorage();
      cy.visit("/");
      cy.wait("@seed");
      cy.contains("Loading demo seed…").should("not.exist");
    });

    it("renders the business unit and both teams from the fixture", () => {
      cy.get("h1").should("contain.text", "Retail Banking (test seed)");
      cy.contains("payments-platform").should("be.visible");
      cy.contains("checkout").should("be.visible");
      cy.contains("h2", "Prove at a glance").should("be.visible");
    });
  });
});
