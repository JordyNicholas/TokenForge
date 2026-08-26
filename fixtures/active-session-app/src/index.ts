import strings from "../locales/en.json" with { type: "json" };

/** Control: small active source. Also shows the locale file is really used. */
export function t(key: string): string {
  return (strings as Record<string, string>)[key] ?? key;
}
