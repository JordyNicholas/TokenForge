/**
 * Content-shaped secret gate — the second half of the credential defence.
 *
 * `risk-core`'s `isSecretPath` catches credential-shaped *names* before a file
 * is ever read. This catches credential-shaped *content* in a file whose name
 * looks innocuous (`config/settings.json` holding a private key), after the
 * excerpt is read but before any of it reaches a backend that may be external.
 *
 * Blocking is the safe direction: a false positive costs one enrichment slot,
 * a false negative ships a live credential off the machine. Callers drop the
 * candidate entirely rather than redacting — a partially redacted file still
 * tells a remote model where the secret lives.
 */

/**
 * High-confidence markers. Kept narrow on purpose: a bare word like "token"
 * appears throughout this codebase, so generic terms only match when they
 * carry a plausible secret *value* (see {@link ASSIGNED_SECRET}).
 */
const SECRET_MARKERS: readonly RegExp[] = [
  /-----BEGIN[A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /"private_key(_id)?"\s*:/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
];

/**
 * `secret: "<16+ chars>"` shapes. The quoted, long value is what separates a
 * real credential from prose or a schema field named `token`.
 */
const ASSIGNED_SECRET =
  /\b(?:api[_-]?keys?|secrets?|passwords?|passwd|access[_-]?tokens?|auth[_-]?tokens?|client[_-]?secrets?|private[_-]?keys?)\b["']?\s*[:=]\s*["'][A-Za-z0-9/+=_.-]{16,}["']/i;

/** True when an excerpt looks like it carries a live credential. */
export function hasSecretContent(excerpt: string): boolean {
  if (excerpt.length === 0) {
    return false;
  }
  if (ASSIGNED_SECRET.test(excerpt)) {
    return true;
  }
  return SECRET_MARKERS.some((pattern) => pattern.test(excerpt));
}
