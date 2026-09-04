import {
  DEMO_SEED_URL,
  SeedLoadError,
  mergeReportsToSeed,
  parseDashboardDocument,
  type DashboardSeed,
} from "../domain";

export { DEMO_SEED_URL };

export async function fetchDashboardDocument(url: string): Promise<DashboardSeed> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SeedLoadError(`Could not fetch ${url}: ${reason}`);
  }
  if (!response.ok) {
    throw new SeedLoadError(`Could not fetch ${url} (${response.status})`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SeedLoadError(`${url} is not JSON`);
  }
  return parseDashboardDocument(payload);
}

export async function parseDashboardFile(file: File): Promise<DashboardSeed> {
  let payload: unknown;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new SeedLoadError(`${file.name} is not JSON`);
  }
  return parseDashboardDocument(payload);
}

/** Multi-file team rollup: each file is a Token Risk report or a seed. */
export async function parseDashboardFiles(
  files: File[],
  businessUnit = "Team rollup",
): Promise<DashboardSeed> {
  const documents: unknown[] = [];
  for (const file of files) {
    try {
      documents.push(JSON.parse(await file.text()));
    } catch {
      throw new SeedLoadError(`${file.name} is not JSON`);
    }
  }
  return mergeReportsToSeed(documents, businessUnit);
}

export async function loadDemoSeed(): Promise<DashboardSeed> {
  return fetchDashboardDocument(DEMO_SEED_URL);
}
