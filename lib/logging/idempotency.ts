/** Deterministic FNV-1a 32-bit hash → 8-hex string (no Node crypto dependency). */
function fnv1a(str: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      // 32-bit multiplication by FNV prime 16777619
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  
  export type IdempotencyParts = {
    provider: "oura" | "withings" | "apple";
    deviceId: string;
    type: "workout" | "cardio" | "nutrition" | "recovery";
    ymd: string;       // YYYY-MM-DD
    startIso?: string; // ISO 8601 start time if available
  };
  
  export function buildIdempotencyKey(p: IdempotencyParts): string {
    const raw = `${p.provider}|${p.deviceId}|${p.type}|${p.ymd}|${p.startIso ?? ""}`;
    return `${p.provider}-${p.type}-${fnv1a(raw)}`;
  }
  
  /** Example: choose a Firestore doc id for imports. */
  export function docIdForImport(p: IdempotencyParts): string {
    return buildIdempotencyKey(p);
  }
  