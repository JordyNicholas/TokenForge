import { UsageError } from "../app/errors";
import { createFixtureUsageProvider, type FixtureUsageProviderOptions } from "./fixture";
import type { UsageProvider, UsageProviderId } from "./types";

export type ResolveUsageProviderOptions = {
  /** Required when id is `fixture`. */
  fixture?: FixtureUsageProviderOptions;
};

/**
 * Resolve a Prove usage adapter. Only `fixture` ships in #89;
 * live vendor adapters land in #90–#92.
 */
export function getUsageProvider(
  id: UsageProviderId,
  options: ResolveUsageProviderOptions = {},
): UsageProvider {
  if (id === "fixture") {
    if (!options.fixture) {
      throw new UsageError(
        'Usage provider "fixture" requires fixture: { filePath } or { metrics }.',
      );
    }
    return createFixtureUsageProvider(options.fixture);
  }
  throw new UsageError(
    `Unknown usage provider "${id}". Wave B #89 ships fixture only; live adapters are #90+.`,
  );
}
