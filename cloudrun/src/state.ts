// cloudrun/src/state.ts
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Compact, tamper-proof OAuth state.
 * Format: base64url(uid).provider.ts.nonce.sig
 *   - sig = HMAC-SHA256 over `${uid}.${provider}.${ts}.${nonce}`
 *   - ts = Date.now() in ms
 */

function toBase64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(s: string): Buffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(b64, "base64");
}

export type MakeStateParams = {
  uid: string;
  provider: string;
  secret: string;
  nowMs?: number; // testability
};

export function makeState({ uid, provider, secret, nowMs }: MakeStateParams): string {
  if (!uid) throw new Error("makeState: missing uid");
  if (!provider) throw new Error("makeState: missing provider");
  if (!secret) throw new Error("makeState: missing secret");

  const ts = String(nowMs ?? Date.now());
  const nonce = randomBytes(8).toString("hex");
  const payload = `${uid}.${provider}.${ts}.${nonce}`;
  const sig = toBase64url(createHmac("sha256", secret).update(payload).digest());
  return `${toBase64url(uid)}.${provider}.${ts}.${nonce}.${sig}`;
}

export type VerifyStateParams = {
  provider: string;
  secret: string;
  nowMs?: number; // testability
  maxAgeMs?: number; // default 10 minutes
};

export type VerifyStateResult =
  | { ok: true; uid: string; ts: number }
  | {
      ok: false;
      reason:
        | "malformed"
        | "provider_mismatch"
        | "bad_sig"
        | "expired"
        | "missing_secret"
        | "bad_ts";
    };

export function verifyState(
  state: string | undefined,
  { provider, secret, nowMs, maxAgeMs = 10 * 60 * 1000 }: VerifyStateParams
): VerifyStateResult {
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!state) return { ok: false, reason: "malformed" };

  const parts = state.split(".");
  if (parts.length !== 5) return { ok: false, reason: "malformed" };

  // Tell TypeScript we definitely have 5 strings here.
  const [uidB64, prov, tsStr, nonce, sigB64] = parts as [
    string,
    string,
    string,
    string,
    string
  ];

  if (prov !== provider) return { ok: false, reason: "provider_mismatch" };

  const uid = fromBase64url(uidB64).toString("utf8");
  const payload = `${uid}.${prov}.${tsStr}.${nonce}`;

  const expected = createHmac("sha256", secret).update(payload).digest();
  const got = fromBase64url(sigB64);

  // Prevent subtle oracle issues
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
    return { ok: false, reason: "bad_sig" };
  }

  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_ts" };

  const now = nowMs ?? Date.now();
  if (now - ts > maxAgeMs || ts > now + 60_000) {
    // too old or from the future (>60s clock skew)
    return { ok: false, reason: "expired" };
  }

  return { ok: true, uid, ts };
}
