/**
 * CLI error types — shared with `@tokenforge/enrichers` so `instanceof` works
 * across scan + hybrid backends.
 */
export {
  RuntimeError,
  UsageError,
  isEnricherError as isCliError,
} from "@tokenforge/enrichers";
