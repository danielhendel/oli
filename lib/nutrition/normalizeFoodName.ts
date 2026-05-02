/**
 * Deterministic food naming + fingerprint for dedupe (UI + payload hints).
 * Vendor payloads stay in RawEvent only; hash is Oli-side identity.
 */

/** Collapse whitespace, lowercase for stable comparisons. */
export function normalizeFoodName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Same rules as name for optional brand. */
export function normalizeBrand(brand: string | undefined): string {
  if (brand == null || brand.trim().length === 0) return "";
  return normalizeFoodName(brand);
}

function hashString32(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909) >>> 0;
  return (h1.toString(16) + h2.toString(16)).slice(0, 32);
}

/**
 * Stable hash over normalized name + brand (+ optional external id when present).
 */
export function computeFoodHash(parts: {
  name: string;
  brand?: string | null;
  externalFoodId?: string | null;
}): string {
  const n = normalizeFoodName(parts.name);
  const b = normalizeBrand(parts.brand ?? undefined);
  const id =
    typeof parts.externalFoodId === "string" && parts.externalFoodId.trim().length > 0
      ? parts.externalFoodId.trim()
      : "";
  const raw = id.length > 0 ? `id:${id}|${n}|${b}` : `${n}|${b}`;
  return `fh_${hashString32(raw)}`;
}

/** Dedupe list items by foodHash (first occurrence wins). */
export function dedupeFoodItemsByHash<T extends { foodHash?: string; id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.foodHash ?? item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
