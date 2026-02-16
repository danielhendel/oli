/**
 * Prefill encoder/decoder helpers for routing payloads through query params.
 * - encodePrefill: object -> base64(JSON)
 * - decodePrefill: base64(JSON) -> object (defensive: {} on any bad input)
 *
 * Works in React Native + Jest without requiring @types/node by using
 * globalThis.atob/btoa when available and falling back to globalThis.Buffer if present.
 */

export type Prefill = Record<string, unknown>;

/** Minimal, typed view of globals we may use (no @types/node required). */
type GlobalPolyfills = {
  btoa?: (data: string) => string;
  atob?: (data: string) => string;
  Buffer?: {
    from: (input: string, encoding: "utf-8" | "base64") => {
      toString: (encoding: "base64" | "utf-8") => string;
    };
  };
};

/** Best-effort base64 encode that works in RN and Jest without Node typings. */
function safeBtoa(input: string): string | null {
  const g = globalThis as unknown as GlobalPolyfills;

  try {
    if (typeof g.btoa === "function") {
      return g.btoa(input);
    }
  } catch {
    /* ignore and try Buffer fallback */
  }

  try {
    if (g.Buffer && typeof g.Buffer.from === "function") {
      return g.Buffer.from(input, "utf-8").toString("base64");
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Best-effort base64 decode that works in RN and Jest without Node typings. */
function safeAtob(input: string): string | null {
  const g = globalThis as unknown as GlobalPolyfills;

  try {
    if (typeof g.atob === "function") {
      return g.atob(input);
    }
  } catch {
    /* ignore and try Buffer fallback */
  }

  try {
    if (g.Buffer && typeof g.Buffer.from === "function") {
      return g.Buffer.from(input, "base64").toString("utf-8");
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Encode any JSON-serializable payload into a compact base64 string for
 * putting on the query string (prefill=...).
 */
export function encodePrefill<T = unknown>(payload: T): string {
  if (!payload || typeof payload !== "object") return "";
  try {
    const json = JSON.stringify(payload);
    const b64 = safeBtoa(json);
    return b64 ?? "";
  } catch {
    return "";
  }
}

/**
 * Safely decodes a base64-encoded JSON prefill string.
 * Returns {} when the input is missing, invalid base64, or not valid JSON.
 */
export function decodePrefill<T = Prefill>(
  encoded?: string | null
): T | Record<string, never> {
  if (!encoded || typeof encoded !== "string" || encoded.trim() === "") {
    return {};
  }
  try {
    const json = safeAtob(encoded);
    if (!json) return {};
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? (obj as T) : {};
  } catch {
    return {};
  }
}
