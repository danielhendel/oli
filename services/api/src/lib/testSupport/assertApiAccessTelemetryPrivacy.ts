/**
 * Recursive assertion helper for generic API access-log telemetry privacy tests.
 * Synthetic data only — never print real UIDs, tokens, dates, or URLs.
 */

/** Exact-match prohibited keys — never allowed anywhere in an access telemetry payload. */
export const PROHIBITED_API_ACCESS_TELEMETRY_KEYS: readonly string[] = [
  "uid",
  "userId",
  "email",
  "sub",
  "ip",
  "remoteAddress",
  "forwardedFor",
  "userAgent",
  "referrer",
  "authorization",
  "cookie",
  "token",
  "apiKey",
  "idempotencyKey",
  "url",
  "originalUrl",
  "rawUrl",
  "path",
  "query",
  "start",
  "end",
  "day",
  "date",
  "timestamp",
  "cursor",
  "providerId",
  "documentId",
  "rawEventId",
  "workoutId",
  "requestBody",
  "responseBody",
  "payload",
  "response",
  "error",
  "errorMessage",
  "stack",
  "rid",
  "ms",
  "status",
];

const PROHIBITED_KEY_SET = new Set(
  PROHIBITED_API_ACCESS_TELEMETRY_KEYS.map((k) => k.toLowerCase()),
);

const ALLOWED_KEYS = new Set([
  "msg",
  "level",
  "operation",
  "method",
  "routetemplate",
  "statuscode",
  "durationms",
  "requestid",
  "authenticated",
  "matchedroute",
  "safeerrorcode",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROHIBITED_VALUE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  /Bearer\s/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./,
  /AIza/,
  /\/users\/(?!me(?:\/|$))[A-Za-z0-9_]{20,}/i, // concrete user path, not /users/me templates
  /[?&](start|end|key|token)=/i,
  /idempotency-/i,
  /https?:\/\//i,
];

export type ApiAccessPrivacyViolation = {
  path: string;
  reason: string;
};

export function findApiAccessTelemetryPrivacyViolations(
  value: unknown,
  path = "$",
): ApiAccessPrivacyViolation[] {
  const violations: ApiAccessPrivacyViolation[] = [];

  const visit = (node: unknown, nodePath: string): void => {
    if (node === null || node === undefined) return;

    if (typeof node === "string") {
      for (const pattern of PROHIBITED_VALUE_PATTERNS) {
        if (pattern.test(node)) {
          violations.push({
            path: nodePath,
            reason: `value matches prohibited pattern ${pattern}`,
          });
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
            reason: `unexpected access-telemetry key "${key}"`,
          });
          continue;
        }
        if (lower === "requestid") {
          if (typeof v !== "string" || !UUID_RE.test(v)) {
            violations.push({
              path: `${nodePath}.${key}`,
              reason: "requestId must be a strict UUID",
            });
            continue;
          }
        }
        if (lower === "routetemplate") {
          if (typeof v !== "string") {
            violations.push({
              path: `${nodePath}.${key}`,
              reason: "routeTemplate must be a string",
            });
            continue;
          }
          // Trusted templates may include :param names; still reject query/date/token shapes.
          for (const pattern of PROHIBITED_VALUE_PATTERNS) {
            if (pattern.test(v)) {
              violations.push({
                path: `${nodePath}.${key}`,
                reason: `routeTemplate matches prohibited pattern ${pattern}`,
              });
              break;
            }
          }
        }
        visit(v, `${nodePath}.${key}`);
      }
    }
  };

  visit(value, path);
  return violations;
}

export function assertApiAccessTelemetryPrivacy(value: unknown): void {
  const violations = findApiAccessTelemetryPrivacyViolations(value);
  if (violations.length > 0) {
    const details = violations.map((v) => `  - ${v.path}: ${v.reason}`).join("\n");
    throw new Error(`API access telemetry privacy violation(s) found:\n${details}`);
  }
}
