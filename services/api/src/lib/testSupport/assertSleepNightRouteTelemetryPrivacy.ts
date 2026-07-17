/**
 * Recursive assertion helper for SleepNight route telemetry privacy tests.
 * Synthetic data only — never print real UIDs, tokens, dates, or URLs.
 */

export const PROHIBITED_SLEEP_NIGHT_ROUTE_TELEMETRY_KEYS: readonly string[] = [
  "uid",
  "userId",
  "email",
  "requestedDay",
  "resolvedDay",
  "anchorDay",
  "wakeDay",
  "start",
  "end",
  "date",
  "day",
  "timestamp",
  "score",
  "durationMinutes",
  "totalSleepMinutes",
  "sleepId",
  "providerId",
  "documentId",
  "sourceDocumentId",
  "cursor",
  "url",
  "path",
  "query",
  "token",
  "authorization",
  "payload",
  "response",
  "error",
  "stack",
];

const PROHIBITED_KEY_SET = new Set(
  PROHIBITED_SLEEP_NIGHT_ROUTE_TELEMETRY_KEYS.map((k) => k.toLowerCase()),
);

const ALLOWED_KEYS = new Set(["msg", "version", "daycount", "operation"]);

const PROHIBITED_VALUE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  /Bearer\s/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./,
  /AIza/,
  /^user_[A-Za-z0-9_]+$/i,
  /^[A-Za-z0-9]{20,}$/, // UID-like / opaque id fixtures
  /https?:\/\//i,
  /[?&](day|start|end|key|token)=/i,
];

export type SleepNightRoutePrivacyViolation = {
  path: string;
  reason: string;
};

export function findSleepNightRouteTelemetryPrivacyViolations(
  value: unknown,
  path = "$",
): SleepNightRoutePrivacyViolation[] {
  const violations: SleepNightRoutePrivacyViolation[] = [];

  const visit = (node: unknown, nodePath: string): void => {
    if (node === null || node === undefined) return;

    if (typeof node === "string") {
      for (const pattern of PROHIBITED_VALUE_PATTERNS) {
        if (pattern.test(node)) {
          // Allow known safe version / msg literals.
          if (
            node === "[SLEEP_NIGHT_ROUTE_VERSION]" ||
            node === "[SLEEP_NIGHT_RANGE_ROUTE]" ||
            node === "sleep-night-resolution-v2" ||
            node === "sleep-night-range-v1" ||
            node === "sleep_night_read"
          ) {
            return;
          }
          violations.push({
            path: nodePath,
            reason: `value matches prohibited pattern ${pattern}`,
          });
          break;
        }
      }
      return;
    }

    if (typeof node === "number") {
      // Aggregate dayCount is allowed; health scores / durations typically fall in similar ranges —
      // key allowlist already rejects score/duration keys. Numbers under non-dayCount keys are unexpected.
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, i) => visit(item, `${nodePath}[${i}]`));
      return;
    }

    if (typeof node === "object") {
      for (const [key, v] of Object.entries(node as Record<string, unknown>)) {
        const lower = key.toLowerCase();
        if (PROHIBITED_KEY_SET.has(lower)) {
          violations.push({
            path: `${nodePath}.${key}`,
            reason: `prohibited key "${key}"`,
          });
          continue;
        }
        if (nodePath === "$" && !ALLOWED_KEYS.has(lower)) {
          violations.push({
            path: `${nodePath}.${key}`,
            reason: `unexpected sleep-night route telemetry key "${key}"`,
          });
          continue;
        }
        visit(v, `${nodePath}.${key}`);
      }
    }
  };

  visit(value, path);
  return violations;
}

export function assertSleepNightRouteTelemetryPrivacy(value: unknown): void {
  const violations = findSleepNightRouteTelemetryPrivacyViolations(value);
  if (violations.length > 0) {
    const details = violations.map((v) => `  - ${v.path}: ${v.reason}`).join("\n");
    throw new Error(`SleepNight route telemetry privacy violation(s) found:\n${details}`);
  }
}
