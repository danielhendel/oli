import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MOBILE_HTTP_TELEMETRY_LOG_LABEL,
  MOBILE_HTTP_TELEMETRY_OPERATION,
  MOBILE_HTTP_TELEMETRY_PROHIBITED_KEYS,
  UNMATCHED_ROUTE_TEMPLATE,
  assertMobileHttpTelemetryPayloadSafe,
  buildMobileHttpTelemetryEvent,
  emitMobileHttpTelemetry,
  isStrictUuid,
  toMobileRouteTemplate,
} from "@/lib/api/mobileHttpTelemetry";

describe("mobileHttpTelemetry", () => {
  const prevVerbose = process.env.EXPO_PUBLIC_MOBILE_HTTP_TELEMETRY_VERBOSE;

  afterEach(() => {
    if (prevVerbose === undefined) {
      delete process.env.EXPO_PUBLIC_MOBILE_HTTP_TELEMETRY_VERBOSE;
    } else {
      process.env.EXPO_PUBLIC_MOBILE_HTTP_TELEMETRY_VERBOSE = prevVerbose;
    }
    jest.restoreAllMocks();
  });

  it("maps sleep-night query path to a day-free route template", () => {
    expect(toMobileRouteTemplate("/users/me/sleep-night?day=2026-07-10")).toBe(
      "/users/me/sleep-night",
    );
  });

  it("parameterizes path day segments and rejects residual dates", () => {
    expect(toMobileRouteTemplate("/users/me/sleep-nights/2026-07-10")).toBe(
      "/users/me/sleep-nights/:day",
    );
  });

  it("returns unmatched sentinel for non-API roots", () => {
    expect(toMobileRouteTemplate("https://evil.example/x")).toBe(UNMATCHED_ROUTE_TEMPLATE);
    expect(toMobileRouteTemplate("/admin/secret")).toBe(UNMATCHED_ROUTE_TEMPLATE);
  });

  it("builds a successful GET event with only allowed fields", () => {
    const event = buildMobileHttpTelemetryEvent({
      method: "GET",
      routePath: "/users/me/sleep-night?day=2026-07-10&t=focus:2026-07-10",
      statusCode: 200,
      durationMs: 12.7,
      authenticated: true,
      apiKeyPresent: true,
    });
    expect(event.operation).toBe(MOBILE_HTTP_TELEMETRY_OPERATION);
    expect(event.method).toBe("GET");
    expect(event.routeTemplate).toBe("/users/me/sleep-night");
    expect(event.statusCode).toBe(200);
    expect(event.durationMs).toBe(13);
    expect(event.authenticated).toBe(true);
    expect(event.apiKeyPresent).toBe(true);
    expect(event.retryCount).toBe(0);
    expect(event.safeErrorCode).toBe("NONE");
    expect(isStrictUuid(event.requestId)).toBe(true);
    assertMobileHttpTelemetryPayloadSafe(event as unknown as Record<string, unknown>);
    for (const key of MOBILE_HTTP_TELEMETRY_PROHIBITED_KEYS) {
      expect(event).not.toHaveProperty(key);
    }
    const json = JSON.stringify(event);
    expect(json).not.toContain("2026-07-10");
    expect(json).not.toMatch(/https?:\/\//i);
    expect(json).not.toMatch(/[?&](key|day|t)=/);
  });

  it.each([
    [200, "POST", "NONE"],
    [400, "POST", "HTTP_4XX"],
    [401, "GET", "HTTP_4XX"],
    [404, "GET", "HTTP_4XX"],
    [500, "POST", "HTTP_5XX"],
  ] as const)("maps status %s %s to %s", (status, method, code) => {
    const event = buildMobileHttpTelemetryEvent({
      method,
      routePath: "/integrations/oura/status",
      statusCode: status,
      durationMs: 1,
      authenticated: true,
      apiKeyPresent: false,
    });
    expect(event.safeErrorCode).toBe(code);
  });

  it("maps network and timeout failures", () => {
    expect(
      buildMobileHttpTelemetryEvent({
        method: "GET",
        routePath: "/users/me/preferences",
        statusCode: 0,
        durationMs: 1,
        authenticated: true,
        apiKeyPresent: false,
        networkError: "Network error",
      }).safeErrorCode,
    ).toBe("NETWORK");
    expect(
      buildMobileHttpTelemetryEvent({
        method: "GET",
        routePath: "/users/me/preferences",
        statusCode: 0,
        durationMs: 1,
        authenticated: true,
        apiKeyPresent: false,
        networkError: "Request timed out",
      }).safeErrorCode,
    ).toBe("TIMEOUT");
  });

  it("generates a unique strict UUID per event", () => {
    const a = buildMobileHttpTelemetryEvent({
      method: "GET",
      routePath: "/health",
      statusCode: 200,
      durationMs: 1,
      authenticated: false,
      apiKeyPresent: false,
    });
    const b = buildMobileHttpTelemetryEvent({
      method: "GET",
      routePath: "/health",
      statusCode: 200,
      durationMs: 1,
      authenticated: false,
      apiKeyPresent: false,
    });
    expect(isStrictUuid(a.requestId)).toBe(true);
    expect(isStrictUuid(b.requestId)).toBe(true);
    expect(a.requestId).not.toBe(b.requestId);
  });

  it("does not emit under Jest by default", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    process.env.EXPO_PUBLIC_MOBILE_HTTP_TELEMETRY_VERBOSE = "1";
    emitMobileHttpTelemetry({
      method: "GET",
      routePath: "/health",
      statusCode: 500,
      durationMs: 1,
      authenticated: false,
      apiKeyPresent: false,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("source guard: telemetry helper never constructs raw-URL payloads", () => {
    const src = readFileSync(join(__dirname, "../mobileHttpTelemetry.ts"), "utf8");
    expect(src).not.toMatch(/console\.log\(\s*["']\[NET_TRACE\]/);
    expect(src).not.toMatch(/console\.log\([^\n]*\burl\s*:/);
    expect(src).toContain(MOBILE_HTTP_TELEMETRY_LOG_LABEL);
    expect(src).toContain("MOBILE_HTTP_TELEMETRY_PROHIBITED_KEYS");
    expect(src).toContain("assertMobileHttpTelemetryPayloadSafe");
  });

  it("source guard: http.ts emits route-template helper only", () => {
    const src = readFileSync(join(__dirname, "../http.ts"), "utf8");
    expect(src).not.toMatch(/console\.log\(\s*["']\[NET_TRACE\]/);
    expect(src).not.toContain("safeNetTraceLog");
    expect(src).toContain("emitMobileHttpTelemetry");
    expect(src).not.toMatch(/emitMobileHttpTelemetry\(\{[\s\S]*?\burl\s*:/);
  });
});
