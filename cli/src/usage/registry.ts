import { UsageError } from "../app/errors";
import { createFixtureUsageProvider, type FixtureUsageProviderOptions } from "./fixture";
import { createCopilotUsageProvider, type CopilotUsageProviderOptions } from "./copilot/copilot";
import type { UsageProvider, UsageProviderId } from "./types";

export type ResolveUsageProviderOptions = {
  /** Required when id is `fixture`. */
  fixture?: FixtureUsageProviderOptions;
  /** Options for live Copilot org billing sync (#90). */
  copilot?: CopilotUsageProviderOptions;
};

/**
 * Resolve a Prove usage adapter.
 * `fixture` = file/demo; `copilot` = org billing + Copilot metrics (#90).
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
  if (id === "copilot") {
    return createCopilotUsageProvider(options.copilot ?? {});
  }
  throw new UsageError(
    `Unknown usage provider "${id}". Supported: fixture, copilot.`,
  );
}
