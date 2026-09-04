import type { ProviderId } from "@tokenforge/risk-core";

/** Short provider expectations for Overview / daily health (Wave D). */
export function providerExpectation(provider: ProviderId): string {
  switch (provider) {
    case "cursor":
      return "Cursor: run promote-shield for Hard .cursorignore — host-honor observation only";
    case "copilot":
      return "Copilot: promote .copilotignore candidates after apply";
    case "claude":
      return "Claude: session-shield is advisory — verify client behavior";
    case "gemini":
      return "Gemini: promote .geminiignore after apply";
    default:
      return "Generic provider: export scan + session for Prove handoff";
  }
}
