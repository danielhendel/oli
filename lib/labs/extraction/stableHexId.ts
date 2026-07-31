/** Deterministic non-crypto id helper for parser candidate keys (pure). */
export function stableHexId(parts: readonly string[], length = 24): string {
  let h = 2166136261;
  const joined = parts.join("|");
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Expand with a second pass for more bits
  let h2 = 0x811c9dc5;
  for (let i = joined.length - 1; i >= 0; i--) {
    h2 ^= joined.charCodeAt(i);
    h2 = Math.imul(h2, 16777619);
  }
  const hex = (Math.abs(h) >>> 0).toString(16).padStart(8, "0") + (Math.abs(h2) >>> 0).toString(16).padStart(8, "0");
  // Mix in length-derived chars for longer ids
  let extra = "";
  let x = h ^ h2;
  while (extra.length + hex.length < length) {
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995);
    extra += (Math.abs(x) >>> 0).toString(16);
  }
  return (hex + extra).slice(0, length);
}
