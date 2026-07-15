/**
 * Privacy-safe mobile HTTP completion telemetry.
 *
 * Emits only route templates and closed unions — never URLs, query values,
 * cache-bust values, keys, tokens, or health dates.
 */

export const MOBILE_HTTP_TELEMETRY_OPERATION = "mobile_http_request_completed" as const;
export const MOBILE_HTTP_TELEMETRY_LOG_LABEL = "[MOBILE_HTTP]" as const;
export const UNMATCHED_ROUTE_TEMPLATE = "UNMATCHED_ROUTE" as const;

export type MobileHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type MobileHttpSafeErrorCode =
  | "NONE"
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "NETWORK"
  | "TIMEOUT"
  | "UNKNOWN";

export type MobileHttpTelemetryEvent = {
  operation: typeof MOBILE_HTTP_TELEMETRY_OPERATION;
  method: MobileHttpMethod;
  routeTemplate: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  authenticated: boolean;
  apiKeyPresent: boolean;
  retryCount: number;
  safeErrorCode: MobileHttpSafeErrorCode;
};

/** Keys that must never appear on a mobile HTTP telemetry payload. */
export const MOBILE_HTTP_TELEMETRY_PROHIBITED_KEYS = [
  "url",
  "originalUrl",
  "query",
  "day",
  "date",
  "start",
  "end",
  "cacheBust",
  "key",
  "token",
  "authorization",
  "body",
  "response",
  "path",
  "host",
  "hostname",
  "headers",
  "stack",
  "payload",
] as const;

const STRICT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const METHOD_SET = new Set<string>(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export function isStrictUuid(value: string): boolean {
  return STRICT_UUID_RE.test(value);
}

export function newTelemetryRequestId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  // Deterministic-shape fallback when crypto.randomUUID is unavailable.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function normalizeMobileHttpMethod(raw: string): MobileHttpMethod {
  const m = raw.toUpperCase();
  if (METHOD_SET.has(m)) return m as MobileHttpMethod;
  return "GET";
}

/**
 * Map a caller path (may include query) to a static route template.
 * Query strings are discarded. Calendar days and opaque ids are parameterized.
 */
export function toMobileRouteTemplate(routePath: string): string {
  const bare = routePath.split("?")[0] ?? "";
  if (!bare.startsWith("/")) return UNMATCHED_ROUTE_TEMPLATE;
  if (bare.includes("://") || bare.includes("@")) return UNMATCHED_ROUTE_TEMPLATE;

  let template = bare
    .replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/g, "/:day")
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi,
      "/:id",
    )
    .replace(/\/[A-Za-z0-9_-]{24,}(?=\/|$)/g, "/:id");

  // Reject residual YYYY-MM-DD anywhere (defense in depth).
  if (/\d{4}-\d{2}-\d{2}/.test(template)) return UNMATCHED_ROUTE_TEMPLATE;

  // Only allow known API roots used by the mobile client.
  const allowedPrefix =
    template === "/health" ||
    template.startsWith("/users/me") ||
    template.startsWith("/integrations/") ||
    template.startsWith("/v1/");
  if (!allowedPrefix) return UNMATCHED_ROUTE_TEMPLATE;

  return template;
}

export function resolveSafeErrorCode(input: {
  statusCode: number;
  networkError?: string | null;
}): MobileHttpSafeErrorCode {
  const msg = (input.networkError ?? "").toLowerCase();
  if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("abort")) {
    return "TIMEOUT";
  }
  if (input.statusCode === 0 || msg.length > 0) return "NETWORK";
  if (input.statusCode >= 500) return "HTTP_5XX";
  if (input.statusCode >= 400) return "HTTP_4XX";
  if (input.statusCode >= 200 && input.statusCode < 300) return "NONE";
  return "UNKNOWN";
}

export function buildMobileHttpTelemetryEvent(input: {
  method: string;
  routePath: string;
  statusCode: number;
  durationMs: number;
  authenticated: boolean;
  apiKeyPresent: boolean;
  retryCount?: number;
  networkError?: string | null;
}): MobileHttpTelemetryEvent {
  const durationMs =
    Number.isFinite(input.durationMs) && input.durationMs >= 0
      ? Math.round(input.durationMs)
      : 0;
  const retryCount =
    typeof input.retryCount === "number" &&
    Number.isFinite(input.retryCount) &&
    input.retryCount >= 0
      ? Math.floor(input.retryCount)
      : 0;

  return {
    operation: MOBILE_HTTP_TELEMETRY_OPERATION,
    method: normalizeMobileHttpMethod(input.method),
    routeTemplate: toMobileRouteTemplate(input.routePath),
    statusCode: Number.isFinite(input.statusCode) ? Math.trunc(input.statusCode) : 0,
    durationMs,
    requestId: newTelemetryRequestId(),
    authenticated: input.authenticated === true,
    apiKeyPresent: input.apiKeyPresent === true,
    retryCount,
    safeErrorCode: resolveSafeErrorCode({
      statusCode: input.statusCode,
      networkError: input.networkError,
    }),
  };
}

export function assertMobileHttpTelemetryPayloadSafe(
  event: Record<string, unknown>,
): void {
  for (const key of MOBILE_HTTP_TELEMETRY_PROHIBITED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(event, key)) {
      throw new Error(`mobile http telemetry prohibited key: ${key}`);
    }
  }
  const serialized = JSON.stringify(event);
  if (/https?:\/\//i.test(serialized)) {
    throw new Error("mobile http telemetry must not contain absolute URLs");
  }
  if (/[?&](key|day|start|end|t)=/i.test(serialized)) {
    throw new Error("mobile http telemetry must not contain query-bearing strings");
  }
  if (/\d{4}-\d{2}-\d{2}/.test(serialized)) {
    throw new Error("mobile http telemetry must not contain calendar day values");
  }
}

/** When `1`, log every successful response in DEV. Default: failures/timeouts only. */
function verboseSuccessTelemetry(): boolean {
  return (
    process.env.EXPO_PUBLIC_MOBILE_HTTP_TELEMETRY_VERBOSE === "1" ||
    process.env.EXPO_PUBLIC_NET_TRACE === "1"
  );
}

/**
 * Emit one privacy-safe completion event (route templates only; never raw URLs).
 */
export function emitMobileHttpTelemetry(input: {
  method: string;
  routePath: string;
  statusCode: number;
  durationMs: number;
  authenticated: boolean;
  apiKeyPresent: boolean;
  retryCount?: number;
  networkError?: string | null;
}): void {
  if (!__DEV__) return;
  if (process.env.JEST_WORKER_ID) return;

  const event = buildMobileHttpTelemetryEvent(input);
  assertMobileHttpTelemetryPayloadSafe(event as unknown as Record<string, unknown>);

  const isFailure =
    event.safeErrorCode !== "NONE" ||
    event.statusCode < 200 ||
    event.statusCode > 299;
  if (!isFailure && !verboseSuccessTelemetry()) return;

  // eslint-disable-next-line no-console
  console.log(MOBILE_HTTP_TELEMETRY_LOG_LABEL, JSON.stringify(event));
}
