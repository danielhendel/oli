/**
 * Shared recursive assertion helper for Oura refresh/post-raw telemetry privacy tests.
 * Fails (throws) if a logged payload contains a prohibited key, or a string value that
 * looks like a date, ISO timestamp, bearer token, API key, or Firestore path.
 */

/** Exact-match prohibited keys — never allowed anywhere in a telemetry payload. */
export const PROHIBITED_TELEMETRY_KEYS: readonly string[] = [
  "uid",
  "userId",
  "email",
  "day",
  "date",
  "start",
  "end",
  "startStr",
  "endStr",
  "sleepStartStr",
  "sleepEndStr",
  "coreStartStr",
  "coreEndStr",
  "requestedDay",
  "resolvedDay",
  "providerDay",
  "latestWakeIso",
  "latestSleepId",
  "sleepId",
  "providerId",
  "documentId",
  "docId",
  "rawEventId",
  "messageId",
  "score",
  "minutes",
  "seconds",
  "stressHigh",
  "recoveryHigh",
  "token",
  "accessToken",
  "refreshToken",
  "idempotencyKey",
  "url",
  "query",
  "payload",
  "response",
  "stack",
  "errorMessage",
  "err",
  "sampleKeys",
  "snapshotId",
  "anchorDay",
  "waitedMs",
];

const PROHIBITED_KEY_SET = new Set(PROHIBITED_TELEMETRY_KEYS.map((k) => k.toLowerCase()));

/** Value patterns that must never appear in a telemetry payload, regardless of key name. */
const PROHIBITED_VALUE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO timestamp
  /Bearer\s/,
  /AIza/,
  /users\//,
];

export type PrivacyViolation = {
  path: string;
  reason: string;
};

/**
 * Recursively walk a value (object/array/primitive) and collect privacy violations:
 * prohibited key names, or string values matching a prohibited pattern.
 */
export function findOuraTelemetryPrivacyViolations(value: unknown, path = "$"): PrivacyViolation[] {
  const violations: PrivacyViolation[] = [];

  const visit = (node: unknown, nodePath: string): void => {
    if (node === null || node === undefined) return;

    if (typeof node === "string") {
      for (const pattern of PROHIBITED_VALUE_PATTERNS) {
        if (pattern.test(node)) {
          violations.push({ path: nodePath, reason: `value matches prohibited pattern ${pattern}` });
          break;
        }
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, i) => visit(item, `${nodePath}[${i}]`));
      return;
    }

    if (typeof node === "object") {
      for (const [key, v] of Object.entries(node as Record<string, unknown>)) {
        if (PROHIBITED_KEY_SET.has(key.toLowerCase())) {
          violations.push({ path: `${nodePath}.${key}`, reason: `prohibited key "${key}"` });
          continue;
        }
        visit(v, `${nodePath}.${key}`);
      }
    }
  };

  visit(value, path);
  return violations;
}

/**
 * Assert a telemetry payload (already-serialized-then-parsed JSON, or a plain object)
 * has no privacy violations. Throws with a readable message listing all violations.
 */
export function assertOuraTelemetryPrivacy(value: unknown): void {
  const violations = findOuraTelemetryPrivacyViolations(value);
  if (violations.length > 0) {
    const details = violations.map((v) => `  - ${v.path}: ${v.reason}`).join("\n");
    throw new Error(`Oura telemetry privacy violation(s) found:\n${details}`);
  }
}
