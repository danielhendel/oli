// apps/mobile/lib/auth/oauth/apple.utils.ts
/**
 * Nonce utilities for Apple Sign-In.
 * - Uses expo-crypto when available (Expo / dev client / device)
 * - Falls back to WebCrypto (Jest/Node)
 * - Returns a HEX string (64 chars)
 */

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i];
    // noUncheckedIndexedAccess: guard the indexed read
    out += (v !== undefined ? v : 0).toString(16).padStart(2, "0");
  }
  return out;
}

/** 32 random bytes → hex */
export async function generateRawNonce(): Promise<string> {
  // Prefer expo-crypto in native/dev client environments
  try {
    const cryptoMod: any = await import("expo-crypto");
    if (typeof cryptoMod.getRandomBytesAsync === "function") {
      const bytes: Uint8Array = await cryptoMod.getRandomBytesAsync(32);
      return toHex(bytes);
    }
  } catch {
    // fall through to WebCrypto / Node
  }

  // WebCrypto (browser/Jest/Node >=19 with global webcrypto)
  const hasWebCrypto =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function";

  if (hasWebCrypto) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return toHex(bytes);
  }

  // Node fallback (dynamic import keeps lint happy)
  try {
    const nodeCrypto: any = await import("node:crypto");
    const bytes: Uint8Array = nodeCrypto.randomBytes(32);
    return toHex(bytes);
  } catch {
    // Extremely unlikely; produce a deterministic nonce from time
    const enc = new TextEncoder();
    const seed = enc.encode(`${Date.now()}-${Math.random()}`);
    const bytes = new Uint8Array(32);
    const len = Math.min(seed.length, bytes.length);
    for (let i = 0; i < len; i++) {
      const s = seed[i];
      bytes[i] = s !== undefined ? s : 0; // guard indexed read
    }
    return toHex(bytes);
  }
}
