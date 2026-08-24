import { UsageError } from "../app/errors";
import { createCopilotUsageProvider, type CopilotUsageProviderOptions } from "./copilot/copilot";
import { createCursorUsageProvider, type CursorUsageProviderOptions } from "./cursor/cursor";
import { createFixtureUsageProvider, type FixtureUsageProviderOptions } from "./fixture";
import type { UsageProvider, UsageProviderId } from "./types";

export type ResolveUsageProviderOptions = {
  /** Required when id is `fixture`. */
  fixture?: FixtureUsageProviderOptions;
  /** Options for live Copilot org billing sync (#90). */
  copilot?: CopilotUsageProviderOptions;
  /** Options for live Cursor org billing sync (#91). */
  cursor?: CursorUsageProviderOptions;
};

/**
 * Resolve a Prove usage adapter.
 * `fixture` = file/demo; live adapters = org billing APIs (#90–#91).
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
  if (id === "cursor") {
    return createCursorUsageProvider(options.cursor ?? {});
  }
  throw new UsageError(
    `Unknown usage provider "${id}". Supported: fixture, copilot, cursor.`,
  );
}
