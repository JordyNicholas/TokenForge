import { KpiCard } from "../../src/ui/Kpi";

// First component spec. KpiCard (dashboard/src/ui/Kpi.tsx) is self-contained
// (MUI only), so it is the cheapest first target for cy.mount.

describe("<KpiCard />", () => {
  it("shows label, value and hint", () => {
    cy.mount(
      <KpiCard
        label="Tokens saved"
        value="1.2M"
        hint="Excluded or filtered from context"
      />,
    );

    cy.contains("Tokens saved").should("be.visible");
    cy.contains("1.2M").should("be.visible");
    cy.contains("Excluded or filtered from context").should("be.visible");
  });

  it("omits the hint line when no hint is passed", () => {
    cy.mount(<KpiCard label="Teams" value="4" />);

    cy.contains("Teams").should("be.visible");
    cy.contains("4").should("be.visible");
  });

  it("becomes clickable when given onClick", () => {
    const onClick = cy.stub().as("onClick");
    cy.mount(<KpiCard label="Teams" value="4" onClick={onClick} />);

    cy.contains("Teams").click();
    cy.get("@onClick").should("have.been.calledOnce");
  });
});
