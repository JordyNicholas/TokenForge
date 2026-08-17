import {
  DEMO_SEED_URL,
  SeedLoadError,
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

export async function loadDemoSeed(): Promise<DashboardSeed> {
  return fetchDashboardDocument(DEMO_SEED_URL);
}
