// lib/util/requestId.ts

/**
 * Create a stable request id for gateway routes that require `x-request-id`.
 *
 * We do NOT need cryptographic randomness here; we just need a low-collision
 * client-generated correlation id. Timestamp + random suffix is sufficient.
 */
export function newRequestId(prefix = "req"): string {
    const now = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${now}_${rand}`;
  }
  