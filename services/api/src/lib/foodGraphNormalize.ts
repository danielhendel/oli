/**
 * Deterministic food name normalization for Oli Food Graph (matches client `normalizeFoodName`).
 */

/** Collapse whitespace, lowercase, Unicode-normalize for stable keys. */
export function normalizeFoodNameForGraph(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeBrandForGraph(brand: string | undefined): string {
  if (brand == null || brand.trim().length === 0) return "";
  return normalizeFoodNameForGraph(brand);
}
