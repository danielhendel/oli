// cloudrun/src/auth.ts
function fnv1a(str: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  
  export function makeState(uid: string, provider: string, secret: string): string {
    const ts = Date.now().toString(36);
    const raw = `${uid}|${provider}|${ts}|${secret}`;
    return `${uid}.${provider}.${ts}.${fnv1a(raw)}`;
  }
  
  export function verifyState(
    state: string,
    secret: string,
    maxAgeMs = 10 * 60 * 1000
  ): { ok: boolean; uid?: string; provider?: string } {
    const parts = state.split(".");
    if (parts.length !== 4) return { ok: false };
    const uid = parts[0]!;
    const provider = parts[1]!;
    const tsStr = parts[2]!;
    const sig = parts[3]!;
    const raw = `${uid}|${provider}|${tsStr}|${secret}`;
    const expect = fnv1a(raw);
    const age = Date.now() - parseInt(tsStr, 36);
    if (expect !== sig || age < 0 || age > maxAgeMs) return { ok: false };
    return { ok: true, uid, provider };
  }
  