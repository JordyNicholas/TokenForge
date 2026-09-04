import { access, copyFile, mkdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { UsageError } from "../../app/errors";
import { stageProveArtifactsForDashboard } from "../../io/prove-handoff";

const ORG_PROVE_PACK_NAME = "org-prove-pack.json";
const ORG_SEED_NAME = "org-seed.json";
const PROVE_PACK_NAME = "prove-pack.json";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export type StageDashboardOptions = {
  /** Pack JSON path or directory containing Prove artifacts. */
  path: string;
  /** Override dashboard/public (default: `<cwd>/dashboard/public`). */
  publicDir?: string;
  dashboardBaseUrl?: string;
};

export type StageDashboardResult = {
  publicDir: string;
  copied: string[];
  bootUrl: string;
  bootQuery: string;
};

function resolvePublicDir(cwd: string, publicDir?: string): string {
  return resolve(publicDir ?? join(cwd, "dashboard/public"));
}

function buildBootUrl(
  baseUrl: string,
  copied: string[],
): { bootUrl: string; bootQuery: string } {
  const base = baseUrl.replace(/\/$/, "");
  if (copied.includes(ORG_PROVE_PACK_NAME)) {
    const bootQuery = `?pack=/${ORG_PROVE_PACK_NAME}`;
    return { bootQuery, bootUrl: `${base}${bootQuery}` };
  }
  const params = new URLSearchParams();
  if (copied.includes(ORG_SEED_NAME)) {
    params.set("src", `/${ORG_SEED_NAME}`);
  } else if (copied.includes("last-scan.json")) {
    params.set("src", "/last-scan.json");
  }
  if (copied.includes("prove-change-latest.json")) {
    params.set("markers", "/prove-change-latest.json");
  }
  if (copied.includes("session-stats.json")) {
    params.set("session", "/session-stats.json");
  }
  if (copied.includes("discover-latest.json")) {
    params.set("discover", "/discover-latest.json");
  }
  const bootQuery = params.toString() ? `?${params.toString()}` : "";
  return { bootQuery, bootUrl: `${base}${bootQuery}` };
}

async function copyIfExists(src: string, destDir: string, destName: string): Promise<string | null> {
  if (!(await exists(src))) {
    return null;
  }
  const dest = join(destDir, destName);
  await copyFile(src, dest);
  return destName;
}

/**
 * Stage org prove-pack / seed / last-scan artifacts into dashboard/public for local Vite boot.
 */
export async function stageDashboard(options: StageDashboardOptions): Promise<StageDashboardResult> {
  const inputPath = resolve(options.path);
  const cwd = process.cwd();
  const publicDir = resolvePublicDir(cwd, options.publicDir);
  const baseUrl = options.dashboardBaseUrl ?? "http://127.0.0.1:5173/board/combined";

  let inputStat;
  try {
    inputStat = await stat(inputPath);
  } catch {
    throw new UsageError(`Path not found: ${inputPath}`);
  }

  await mkdir(publicDir, { recursive: true });
  const copied: string[] = [];

  if (inputStat.isFile()) {
    const name = basename(inputPath);
    if (name === ORG_PROVE_PACK_NAME || name === PROVE_PACK_NAME || name.endsWith("-prove-pack.json")) {
      await copyFile(inputPath, join(publicDir, ORG_PROVE_PACK_NAME));
      copied.push(ORG_PROVE_PACK_NAME);
    } else if (name === ORG_SEED_NAME || name.endsWith("-seed.json")) {
      await copyFile(inputPath, join(publicDir, ORG_SEED_NAME));
      copied.push(ORG_SEED_NAME);
    } else {
      throw new UsageError(
        `Expected org prove-pack or seed JSON, got ${name}. Use prove-pack or org-seed output.`,
      );
    }
  } else {
    const stagedNames = await stageProveArtifactsForDashboard({
      root: inputPath,
      dashboardPublicDir: publicDir,
    });
    copied.push(...stagedNames);

    for (const [srcName, destName] of [
      [ORG_PROVE_PACK_NAME, ORG_PROVE_PACK_NAME],
      [PROVE_PACK_NAME, ORG_PROVE_PACK_NAME],
      [ORG_SEED_NAME, ORG_SEED_NAME],
    ] as const) {
      const name = await copyIfExists(join(inputPath, srcName), publicDir, destName);
      if (name && !copied.includes(name)) {
        copied.push(name);
      }
    }

    const tokenforgeProvePack = join(inputPath, ".tokenforge", PROVE_PACK_NAME);
    const stagedPack = await copyIfExists(tokenforgeProvePack, publicDir, ORG_PROVE_PACK_NAME);
    if (stagedPack && !copied.includes(stagedPack)) {
      copied.push(stagedPack);
    }
  }

  if (copied.length === 0) {
    throw new UsageError(
      `Nothing to stage from ${inputPath}. Run prove-pack or ensure .tokenforge/ scan artifacts exist.`,
    );
  }

  const { bootUrl, bootQuery } = buildBootUrl(baseUrl, copied);
  return { publicDir, copied, bootUrl, bootQuery };
}
