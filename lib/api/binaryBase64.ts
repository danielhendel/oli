/**
 * React-Native-safe binary ↔ base64 helpers for Body Scan original-report materialization.
 *
 * PDF bytes are arbitrary binary. Never route them through UTF-8 / TextDecoder.
 * Avoid `String.fromCharCode(...largeTypedArray)` — Hermes/JS engines cap argument counts.
 */

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const; // %PDF

/** True when the first four bytes are the PDF magic `%PDF`. */
export function isPdfMagicBytes(bytes: ArrayBuffer | Uint8Array): boolean {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.byteLength < PDF_MAGIC.length) return false;
  return (
    u8[0] === PDF_MAGIC[0] &&
    u8[1] === PDF_MAGIC[1] &&
    u8[2] === PDF_MAGIC[2] &&
    u8[3] === PDF_MAGIC[3]
  );
}

/**
 * Encode an ArrayBuffer as standard base64 for FileSystem.writeAsStringAsync(Base64).
 * Chunked Latin-1 binary string → btoa (or Buffer on Node/Jest).
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Keep chunks well under JS argument / call-stack limits.
  const chunkSize = 0x2000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    // Build without spread so high-bit / null bytes survive unchanged.
    let chunk = "";
    for (let j = i; j < end; j += 1) {
      chunk += String.fromCharCode(bytes[j]!);
    }
    binary += chunk;
  }
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary);
  }
  // Jest / Node fallback when btoa is absent.
  return Buffer.from(bytes).toString("base64");
}

/** Decode base64 into bytes (strips whitespace that some native encoders insert). */
export function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/[\r\n\s]/g, "");
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(cleaned);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i) & 0xff;
    }
    return out;
  }
  return new Uint8Array(Buffer.from(cleaned, "base64"));
}

/**
 * Expo iOS `readAsStringAsync` with encoding Base64 + length honors byte length.
 * UTF8 encoding ignores length/position and decodes the whole file — which fails on binary PDFs.
 */
export function isPdfMagicBase64Head(base64Head: string): boolean {
  try {
    const bytes = base64ToUint8Array(base64Head);
    return isPdfMagicBytes(bytes);
  } catch {
    return false;
  }
}

/** Safe Content-Type bucket — never log the raw header. */
export type ContentTypeBucket = "pdf" | "octet_stream" | "other" | "absent";

export function contentTypeToBucket(contentType: string | null): ContentTypeBucket {
  if (contentType == null || contentType.trim() === "") return "absent";
  const lower = contentType.split(";")[0]!.trim().toLowerCase();
  if (lower === "application/pdf") return "pdf";
  if (lower === "application/octet-stream" || lower === "binary/octet-stream") {
    return "octet_stream";
  }
  return "other";
}

export type ContentLengthMatch = "match" | "mismatch" | "unavailable";

export function compareContentLengthToByteLength(
  contentLengthHeader: string | null,
  byteLength: number,
): ContentLengthMatch {
  if (contentLengthHeader == null || contentLengthHeader.trim() === "") return "unavailable";
  const trimmed = contentLengthHeader.trim();
  if (!/^\d+$/.test(trimmed)) return "unavailable";
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n < 0) return "unavailable";
  return n === byteLength ? "match" : "mismatch";
}

/** Classify body prefix without printing content (byte signatures only). */
export type BodyPrefixClassification =
  | "pdf"
  | "xml"
  | "html"
  | "json"
  | "unknown_binary";

export function classifyBodyPrefix(bytes: ArrayBuffer | Uint8Array): BodyPrefixClassification {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (isPdfMagicBytes(u8)) return "pdf";
  if (u8.byteLength >= 5) {
    // <?xml or <htm / <!do / { / [
    const head = String.fromCharCode(
      u8[0]!,
      u8[1]!,
      u8[2]!,
      u8[3]!,
      u8[4]!,
    ).toLowerCase();
    if (head.startsWith("<?xml") || head.startsWith("<xml")) return "xml";
    if (head.startsWith("<!doc") || head.startsWith("<html") || head.startsWith("<htm")) {
      return "html";
    }
  }
  if (u8.byteLength >= 1) {
    const c0 = u8[0]!;
    if (c0 === 0x7b /* { */ || c0 === 0x5b /* [ */) return "json";
  }
  return "unknown_binary";
}
