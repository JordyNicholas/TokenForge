import { BYTES_PER_TOKEN } from "../domain/constants";

/**
 * Token estimate for a path of `bytes` length.
 * Non-finite or negative sizes count as zero.
 */
export function estimateTokens(bytes: number): number {
  const size = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  return Math.ceil(size / BYTES_PER_TOKEN);
}
