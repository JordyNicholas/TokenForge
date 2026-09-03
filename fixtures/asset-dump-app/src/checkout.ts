export function total(cents: number[]): number {
  return cents.reduce((sum, value) => sum + value, 0);
}
