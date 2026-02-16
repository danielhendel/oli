// cloudrun/src/verify.ts
import crypto from "crypto";

export function hmacEquals(raw: Buffer, secret: string, headerSig: string) {
  const computed = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(headerSig), Buffer.from(computed));
  } catch {
    return false;
  }
}

/**
 * Example Oura verifier.
 * Header we expect: 'x-oura-signature' carrying base64(HMAC_SHA256(rawBody, secret))
 * Adjust if your provider uses a different header or encoding.
 */
export function verifyOura(raw: Buffer, secret: string, headerSig?: string | string[]) {
  if (!headerSig || typeof headerSig !== "string") return false;
  return hmacEquals(raw, secret, headerSig);
}
