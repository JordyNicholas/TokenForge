import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { honorSmokePath } from "../../io/paths";

export const HONOR_SMOKE_HONESTY =
  "Host-honor smoke checks whether Cursor appears to respect ignore files on this machine. It is observation of host behavior — not metering of any agent private context pipeline.";

export type HonorSmokeStep = {
  id: string;
  title: string;
  instruction: string;
  pathsToVerify: readonly string[];
  passCriteria: string;
};

export type HonorSmokeMode = {
  mode: "soft" | "hard";
  ignoreFile: string;
  effectiveness: string;
  honesty: string;
  steps: HonorSmokeStep[];
};

export type HonorSmokeArtifact = {
  schemaVersion: 1;
  generatedAt: string;
  provider: "cursor";
  honestyNote: string;
  modes: HonorSmokeMode[];
};

const SAMPLE_PATHS = ["node_modules/", "dist/", "coverage/", ".git/"] as const;

function buildSteps(mode: "soft" | "hard", ignoreFile: string): HonorSmokeStep[] {
  const modeLabel = mode === "soft" ? "Soft (indexing)" : "Hard (context)";
  return [
    {
      id: `${mode}-file-present`,
      title: `${modeLabel} — ignore file exists`,
      instruction: `Confirm \`${ignoreFile}\` exists at repo root (create via Shield, promote-shield, or apply candidates).`,
      pathsToVerify: [ignoreFile],
      passCriteria: `File readable; contains a TokenForge managed section or promoted patterns.`,
    },
    {
      id: `${mode}-pattern-listed`,
      title: `${modeLabel} — high-risk path listed`,
      instruction: `Add or verify a known bulky path (e.g. \`node_modules/\`) appears in \`${ignoreFile}\`.`,
      pathsToVerify: [...SAMPLE_PATHS],
      passCriteria: `Pattern present in ${ignoreFile} (exact or glob).`,
    },
    {
      id: `${mode}-host-observe`,
      title: `${modeLabel} — observe host behavior`,
      instruction:
        mode === "soft"
          ? "Re-index / open repo in Cursor; confirm indexed file count or @-mention behavior skips listed paths (host-dependent)."
          : "Open Agent/Chat on a listed path; confirm the host does not attach that file (tab/context observation — not API metering).",
      pathsToVerify: SAMPLE_PATHS.slice(0, 2),
      passCriteria:
        "Operator notes whether Cursor appeared to honor the ignore entry. Partial honor is OK — record honestly.",
    },
  ];
}

/** Build the honor-smoke checklist artifact (Cursor Soft/Hard). */
export function buildHonorSmokeArtifact(
  generatedAt: string = new Date().toISOString(),
): HonorSmokeArtifact {
  return {
    schemaVersion: 1,
    generatedAt,
    provider: "cursor",
    honestyNote: HONOR_SMOKE_HONESTY,
    modes: [
      {
        mode: "soft",
        ignoreFile: ".cursorindexingignore",
        effectiveness: "indexing-only — partial; context may still leak",
        honesty: HONOR_SMOKE_HONESTY,
        steps: buildSteps("soft", ".cursorindexingignore"),
      },
      {
        mode: "hard",
        ignoreFile: ".cursorignore",
        effectiveness: "full when honored — host observation only",
        honesty: HONOR_SMOKE_HONESTY,
        steps: buildSteps("hard", ".cursorignore"),
      },
    ],
  };
}

export type WriteHonorSmokeResult = {
  outPath: string;
  artifact: HonorSmokeArtifact;
};

/** Write `.tokenforge/honor-smoke.json` checklist for Cursor host-honor verification. */
export async function writeHonorSmoke(options: {
  root: string;
  outPath?: string;
}): Promise<WriteHonorSmokeResult> {
  const root = resolve(options.root);
  const artifact = buildHonorSmokeArtifact();
  const outPath = resolve(options.outPath ?? honorSmokePath(root));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return { outPath, artifact };
}
