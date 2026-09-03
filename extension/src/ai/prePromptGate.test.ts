import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const showWarningMessage = vi.fn();
const executeCommand = vi.fn();

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get }) },
  window: { showWarningMessage },
  commands: { executeCommand },
}));

describe("runPrePromptGate", () => {
  beforeEach(() => {
    get.mockReset();
    showWarningMessage.mockReset();
    executeCommand.mockReset();
  });

  it("skips the modal when the setting is off", async () => {
    get.mockImplementation((key: string) => {
      if (key === "prePromptGate") {
        return false;
      }
      return undefined;
    });
    const { runPrePromptGate } = await import("./prePromptGate");
    const session = {
      displayAtRiskTokens: () => 20_000,
      shieldAllPending: vi.fn(),
    };
    await expect(runPrePromptGate(session as never)).resolves.toBe(true);
    expect(showWarningMessage).not.toHaveBeenCalled();
  });

  it("Review tabs focuses Open tabs and aborts Prepare", async () => {
    vi.resetModules();
    get.mockImplementation((key: string) => {
      if (key === "prePromptGate") {
        return true;
      }
      if (key === "rulesBudgetThreshold") {
        return 8_000;
      }
      return undefined;
    });
    showWarningMessage.mockResolvedValue("Review tabs");
    const { runPrePromptGate } = await import("./prePromptGate");
    const ok = await runPrePromptGate({
      displayAtRiskTokens: () => 12_000,
      shieldAllPending: vi.fn(),
    } as never);
    expect(ok).toBe(false);
    expect(executeCommand).toHaveBeenCalledWith("tokenforge.focusRiskPanel");
  });

  it("dismissing the modal is Skip", async () => {
    vi.resetModules();
    get.mockImplementation((key: string) => {
      if (key === "prePromptGate") {
        return true;
      }
      if (key === "rulesBudgetThreshold") {
        return 100;
      }
      return undefined;
    });
    showWarningMessage.mockResolvedValue(undefined);
    const { runPrePromptGate } = await import("./prePromptGate");
    await expect(
      runPrePromptGate({
        displayAtRiskTokens: () => 500,
        shieldAllPending: vi.fn(),
      } as never),
    ).resolves.toBe(false);
  });
});
