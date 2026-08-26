/** Control: real source, genuinely distinct per package. */
export function toCsvRow(values: readonly string[]): string {
  return values.map((value) => `"${value.replaceAll('"', '""')}"`).join(",");
}
