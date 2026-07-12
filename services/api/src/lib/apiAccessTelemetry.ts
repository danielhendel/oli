/**
 * Privacy-safe telemetry for generic API HTTP access logging.
 *
 * Design goal: every access-log emission goes through `logApiAccessTelemetry`
 * with a closed set of typed, aggregate-only fields. No uid, email, raw URL,
 * query names/values, headers, bodies, or concrete path parameters are accepted.
 */

import { randomUUID } from "crypto";
import type { Request } from "express";

import { logger } from "./logger";

/**
 * Strict opaque request-trace ID for access telemetry.
 * Accepts only RFC UUID form (36 chars). Anything else is discarded and replaced
 * with a new server-generated UUID. Never hashes, truncates, or encodes unsafe input.
 * Does not change HTTP `x-request-id` response correlation.
 */
const ACCESS_TELEMETRY_REQUEST_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACCESS_TELEMETRY_REQUEST_ID_MAX_LEN = 36;

export function sanitizeApiAccessTelemetryRequestId(candidate: unknown): string {
  if (typeof candidate !== "string") return randomUUID();
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > ACCESS_TELEMETRY_REQUEST_ID_MAX_LEN) {
    return randomUUID();
  }
  if (!ACCESS_TELEMETRY_REQUEST_ID_UUID.test(trimmed)) {
    return randomUUID();
  }
  return trimmed;
}

export type ApiAccessHttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD"
  | "OTHER";

const KNOWN_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);

export function normalizeApiAccessMethod(method: unknown): ApiAccessHttpMethod {
  if (typeof method !== "string") return "OTHER";
  const upper = method.trim().toUpperCase();
  if (KNOWN_METHODS.has(upper)) return upper as ApiAccessHttpMethod;
  return "OTHER";
}

/** Closed operational error codes for access telemetry (optional). */
export type ApiAccessSafeErrorCode =
  | "CLIENT_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

const SAFE_ERROR_CODES: ReadonlySet<string> = new Set([
  "CLIENT_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "UNKNOWN",
]);

function isApiAccessSafeErrorCode(v: unknown): v is ApiAccessSafeErrorCode {
  return typeof v === "string" && SAFE_ERROR_CODES.has(v);
}

export function safeErrorCodeForStatus(statusCode: number): ApiAccessSafeErrorCode | undefined {
  if (!Number.isFinite(statusCode) || statusCode < 400) return undefined;
  if (statusCode === 401) return "UNAUTHENTICATED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 429) return "RATE_LIMITED";
  if (statusCode >= 500) return "SERVER_ERROR";
  if (statusCode >= 400) return "CLIENT_ERROR";
  return "UNKNOWN";
}

export const UNMATCHED_ROUTE_TEMPLATE = "UNMATCHED_ROUTE";
export const MATCHED_ROUTE_FALLBACK_TEMPLATE = "MATCHED_ROUTE";

/**
 * Reject derived route-template candidates that look like concrete identifiers,
 * query strings, tokens, or dates. Fall back to MATCHED_ROUTE when unsafe.
 */
const UNSAFE_ROUTE_TEMPLATE_PATTERNS: readonly RegExp[] = [
  /[?#@]/,
  /Bearer\s/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./, // JWT-like
  /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD or ISO date fragment
  /%/, // encoded path values
  /\/users\/(?!me(?:\/|$))[A-Za-z0-9_]{20,}/i, // concrete user path, not /users/me
];

export function isTrustedRouteTemplate(candidate: string): boolean {
  if (typeof candidate !== "string") return false;
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > 256) return false;
  if (trimmed !== UNMATCHED_ROUTE_TEMPLATE && trimmed !== MATCHED_ROUTE_FALLBACK_TEMPLATE) {
    if (!trimmed.startsWith("/")) return false;
  }
  for (const pattern of UNSAFE_ROUTE_TEMPLATE_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  return true;
}

function joinBaseAndRoutePath(baseUrl: string, routePath: string): string {
  const base = baseUrl.trim();
  const path = routePath.trim();
  if (path === "" || path === "/") {
    if (base === "" || base === "/") return "/";
    return base.replace(/\/{2,}/g, "/") || "/";
  }
  if (base === "" || base === "/") {
    return (path.startsWith("/") ? path : `/${path}`).replace(/\/{2,}/g, "/");
  }
  const left = base.endsWith("/") ? base.slice(0, -1) : base;
  const right = path.startsWith("/") ? path : `/${path}`;
  return `${left}${right}`.replace(/\/{2,}/g, "/");
}

export type RouteTemplateResolution = {
  routeTemplate: string;
  matchedRoute: boolean;
};

/**
 * Derive a server-owned route template after Express routing when possible.
 * Never falls back to raw URL / originalUrl / query.
 */
export function resolveApiAccessRouteTemplate(req: Request): RouteTemplateResolution {
  const route = (req as Request & { route?: { path?: unknown } }).route;
  if (!route) {
    return { routeTemplate: UNMATCHED_ROUTE_TEMPLATE, matchedRoute: false };
  }

  const routePath = route.path;
  if (typeof routePath !== "string") {
    // RegExp, array, or other unsafe metadata
    return { routeTemplate: MATCHED_ROUTE_FALLBACK_TEMPLATE, matchedRoute: true };
  }

  const baseUrl = typeof req.baseUrl === "string" ? req.baseUrl : "";
  const joined = joinBaseAndRoutePath(baseUrl, routePath);
  if (!isTrustedRouteTemplate(joined)) {
    return { routeTemplate: MATCHED_ROUTE_FALLBACK_TEMPLATE, matchedRoute: true };
  }
  return { routeTemplate: joined, matchedRoute: true };
}

export type ApiAccessTelemetryEvent = {
  operation: "http_request_completed";
  method: ApiAccessHttpMethod;
  routeTemplate: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  authenticated: boolean;
  matchedRoute: boolean;
  safeErrorCode?: ApiAccessSafeErrorCode;
};

function isFiniteNonNegativeInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * Log one generic API access-completion event. Only the event's typed fields are
 * emitted — requestId is always re-sanitized; routeTemplate is re-validated.
 */
export function logApiAccessTelemetry(event: ApiAccessTelemetryEvent): void {
  const method = normalizeApiAccessMethod(event.method);
  const statusCode = isFiniteNonNegativeInt(event.statusCode)
    ? Math.round(event.statusCode)
    : 0;
  const durationMs = isFiniteNonNegativeInt(event.durationMs)
    ? Math.round(event.durationMs)
    : 0;
  const requestId = sanitizeApiAccessTelemetryRequestId(event.requestId);

  let routeTemplate = event.routeTemplate;
  if (!isTrustedRouteTemplate(routeTemplate)) {
    routeTemplate = event.matchedRoute
      ? MATCHED_ROUTE_FALLBACK_TEMPLATE
      : UNMATCHED_ROUTE_TEMPLATE;
  }

  const payload: {
    msg: "http_request_completed";
    operation: "http_request_completed";
    method: ApiAccessHttpMethod;
    routeTemplate: string;
    statusCode: number;
    durationMs: number;
    requestId: string;
    authenticated: boolean;
    matchedRoute: boolean;
    safeErrorCode?: ApiAccessSafeErrorCode;
  } = {
    msg: "http_request_completed",
    operation: "http_request_completed",
    method,
    routeTemplate,
    statusCode,
    durationMs,
    requestId,
    authenticated: event.authenticated === true,
    matchedRoute: event.matchedRoute === true,
  };

  if (event.safeErrorCode !== undefined && isApiAccessSafeErrorCode(event.safeErrorCode)) {
    payload.safeErrorCode = event.safeErrorCode;
  } else {
    const derived = safeErrorCodeForStatus(statusCode);
    if (derived) payload.safeErrorCode = derived;
  }

  logger.info(payload);
}

export type AccessLogRequestLike = Request & {
  rid?: string;
  uid?: string;
};

/**
 * Build a privacy-safe access telemetry event from an Express request/response pair.
 * Does not read headers, query, body, or raw URL.
 */
export function buildApiAccessTelemetryEvent(args: {
  req: AccessLogRequestLike;
  statusCode: number;
  durationMs: number;
}): ApiAccessTelemetryEvent {
  const { req, statusCode, durationMs } = args;
  const { routeTemplate, matchedRoute } = resolveApiAccessRouteTemplate(req);
  const authenticated = typeof req.uid === "string" && req.uid.length > 0;
  const event: ApiAccessTelemetryEvent = {
    operation: "http_request_completed",
    method: normalizeApiAccessMethod(req.method),
    routeTemplate,
    statusCode,
    durationMs,
    requestId: sanitizeApiAccessTelemetryRequestId(req.rid),
    authenticated,
    matchedRoute,
  };
  const code = safeErrorCodeForStatus(statusCode);
  if (code) event.safeErrorCode = code;
  return event;
}
