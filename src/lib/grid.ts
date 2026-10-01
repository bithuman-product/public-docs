// Card rows (owner, 2026-10-01: "each row should contain no more than 4
// cards"): the fewest rows of at most `max` cards, then as few columns as
// keep that many rows, so rows come out balanced: 12 → 4+4+4, 8 → 4+4,
// 6 → 3+3, 5 → 3+2, 3 → 3. scripts/check-card-rows.mjs grades the built pages.
export const MAX_CARDS_PER_ROW = 4;
export function balancedCols(n: number, max = MAX_CARDS_PER_ROW): number {
  if (n <= 0) return 1;
  const rows = Math.ceil(n / max);
  return Math.ceil(n / rows);
}
