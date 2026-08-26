import {
  API_CONTRACT_PATTERNS,
  AUXILIARY_DATA_DIR_NAMES,
  NECESSARY_GENERATED_SEGMENTS,
  PROTECTED_CONFIG_NAMES,
  PROTECTED_CONFIG_PATTERNS,
} from "../domain/constants";
import { fileName, pathSegments } from "../classify/classify";
import type { FindingReason, ProtectionKind } from "../domain/types";

export type PathProtection = {
  kind: ProtectionKind;
  /**
   * Reasons {@link protectionFor} suppresses in `scoreRisk`.
   * `inactive_tab` is never suppressed: that is the extension's reversible
   * Keep/Filter hint, chosen per session by the developer, not a repo-wide
   * exclusion the policy pack writes.
   */
  suppresses: readonly FindingReason[];
};

function matchesAny(name: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

export function isProtectedConfigPath(path: string): boolean {
  const name = fileName(path);
  return (
    PROTECTED_CONFIG_NAMES.has(name) ||
    matchesAny(name, PROTECTED_CONFIG_PATTERNS)
  );
}

export function isApiContractPath(path: string): boolean {
  return matchesAny(fileName(path), API_CONTRACT_PATTERNS);
}

/**
 * True for `**\/generated/<api-ish>/**` trees — a generated GraphQL/OpenAPI
 * client an agent reads to call the API correctly, unlike compiled bundles.
 * Requires the pairing so a hand-written `src/graphql/` is not swept in.
 */
export function isNecessaryGeneratedPath(path: string): boolean {
  const segments = pathSegments(path);
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index]!.toLowerCase();
    if (current !== "generated" && current !== ".generated") {
      continue;
    }
    const next = segments[index + 1]!.toLowerCase();
    if (NECESSARY_GENERATED_SEGMENTS.has(next)) {
      return true;
    }
  }
  return false;
}

/** True for files under a recognized fixture / mock / recorded-payload tree. */
export function isAuxiliaryDataPath(path: string): boolean {
  const segments = pathSegments(path);
  // Last segment is the filename, so stop before it.
  return segments
    .slice(0, -1)
    .some((segment) => AUXILIARY_DATA_DIR_NAMES.has(segment.toLowerCase()));
}

/**
 * Exclusion exemption for a path, or `undefined` when nothing protects it.
 * Order: protected config → API contract → necessary generated. First match
 * wins, so a `generated/openapi/openapi.json` reports the contract rather
 * than the tree it sits in.
 */
export function protectionFor(path: string): PathProtection | undefined {
  if (isProtectedConfigPath(path)) {
    // Both drivers: a protected config must not be excluded for being large
    // (it rarely is) or for the class it lands in.
    return {
      kind: "protected_config",
      suppresses: ["oversized", "high_risk_filetype"],
    };
  }
  if (isApiContractPath(path)) {
    return { kind: "api_contract", suppresses: ["oversized"] };
  }
  if (isNecessaryGeneratedPath(path)) {
    // Size still counts: a necessary schema that is enormous is worth a look.
    return { kind: "necessary_generated", suppresses: ["high_risk_filetype"] };
  }
  return undefined;
}
