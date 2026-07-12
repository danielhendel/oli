/**
 * Unit + middleware tests for privacy-safe generic API access telemetry.
 * Uses synthetic sentinels only — never prints them to the console on failure paths
 * that would echo payload bodies (assertions use not.toContain / privacy helper).
 */
import express, { type Express, type Request } from "express";
import http from "http";
import type { AddressInfo } from "net";

import {
  MATCHED_ROUTE_FALLBACK_TEMPLATE,
  UNMATCHED_ROUTE_TEMPLATE,
  buildApiAccessTelemetryEvent,
  isTrustedRouteTemplate,
  logApiAccessTelemetry,
  normalizeApiAccessMethod,
  resolveApiAccessRouteTemplate,
  sanitizeApiAccessTelemetryRequestId,
  safeErrorCodeForStatus,
  type ApiAccessTelemetryEvent,
} from "../apiAccessTelemetry";
import { accessLogMiddleware } from "../../middleware/accessLogMiddleware";
import { requestIdMiddleware } from "../logger";
import { assertApiAccessTelemetryPrivacy } from "../testSupport/assertApiAccessTelemetryPrivacy";
import * as loggerModule from "../logger";

const SAFE_REQUEST_ID = "3237605a-ceb7-44bc-958e-be8954b9e939";

/** Synthetic sentinels — referenced in assertions via not.toContain; do not console.log them. */
const SENTINEL = {
  uid: "UID_SENTINEL_abcdefghijklmnopqrstuv",
  start: "2099-01-02",
  end: "2099-01-09",
  authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SENTINEL.sig",
  apiKey: "AIzaSySENTINEL_KEY_VALUE_XXXX",
  unsafeRequestId: "not-a-uuid-SENTINEL-request-id",
} as const;

function captureInfoLogs(): { events: unknown[]; restore: () => void } {
  const events: unknown[] = [];
  const original = loggerModule.logger.info;
  loggerModule.logger.info = (o: Record<string, unknown>) => {
    events.push(o);
  };
  return {
    events,
    restore: () => {
      loggerModule.logger.info = original;
    },
  };
}

describe("sanitizeApiAccessTelemetryRequestId", () => {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("accepts a valid UUID", () => {
    expect(sanitizeApiAccessTelemetryRequestId(SAFE_REQUEST_ID)).toBe(SAFE_REQUEST_ID);
  });

  it.each([
    ["arbitrary text", "not-a-uuid-at-all"],
    ["email-like", "user_SENTINEL@example.com"],
    ["date-like", "2099-01-02"],
    ["url-like", "https://evil.example/path?start=2099-01-02"],
    ["bearer-token-like", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb"],
    ["firebase-token-like", "eyJhbGciOiJSUzI1NiIsImtpZCI6ImZha2UifQ.payload.sig"],
    ["idempotency-key-like", "idempotency-oura-pull-abc123"],
    ["uid-like", "firebaseUid_SENTINEL_abc"],
    ["firestore-path", "users/abc123/ouraVendorSleep/doc"],
    ["oversized", `${"a".repeat(40)}`],
    ["empty", ""],
  ])("replaces %s input with a new UUID", (_label, input) => {
    const out = sanitizeApiAccessTelemetryRequestId(input);
    expect(out).toMatch(uuidRe);
    expect(out).not.toBe(input);
    expect(out).not.toContain("SENTINEL");
  });
});

describe("normalizeApiAccessMethod", () => {
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const)(
    "keeps %s",
    (m) => {
      expect(normalizeApiAccessMethod(m)).toBe(m);
      expect(normalizeApiAccessMethod(m.toLowerCase())).toBe(m);
    },
  );

  it("maps unknown methods to OTHER", () => {
    expect(normalizeApiAccessMethod("TRACE")).toBe("OTHER");
    expect(normalizeApiAccessMethod(null)).toBe("OTHER");
  });
});

describe("resolveApiAccessRouteTemplate", () => {
  it("joins nested baseUrl + route.path", () => {
    const req = {
      baseUrl: "/users/me",
      route: { path: "/oura-stress" },
    } as unknown as Request;
    expect(resolveApiAccessRouteTemplate(req)).toEqual({
      routeTemplate: "/users/me/oura-stress",
      matchedRoute: true,
    });
  });

  it("preserves root route", () => {
    const req = {
      baseUrl: "",
      route: { path: "/" },
    } as unknown as Request;
    expect(resolveApiAccessRouteTemplate(req)).toEqual({
      routeTemplate: "/",
      matchedRoute: true,
    });
  });

  it("keeps declared dynamic templates without substituting params", () => {
    const req = {
      baseUrl: "",
      route: { path: "/ingest/:rawEventId" },
    } as unknown as Request;
    expect(resolveApiAccessRouteTemplate(req)).toEqual({
      routeTemplate: "/ingest/:rawEventId",
      matchedRoute: true,
    });
  });

  it("returns UNMATCHED_ROUTE when no route matched", () => {
    const req = { baseUrl: "", originalUrl: "/nope?start=2099-01-02" } as unknown as Request;
    expect(resolveApiAccessRouteTemplate(req)).toEqual({
      routeTemplate: UNMATCHED_ROUTE_TEMPLATE,
      matchedRoute: false,
    });
  });

  it("returns MATCHED_ROUTE for RegExp route metadata", () => {
    const req = {
      baseUrl: "/users/me",
      route: { path: /oura-.*/ },
    } as unknown as Request;
    expect(resolveApiAccessRouteTemplate(req)).toEqual({
      routeTemplate: MATCHED_ROUTE_FALLBACK_TEMPLATE,
      matchedRoute: true,
    });
  });

  it("returns MATCHED_ROUTE for array route metadata", () => {
    const req = {
      baseUrl: "",
      route: { path: ["/a", "/b"] },
    } as unknown as Request;
    expect(resolveApiAccessRouteTemplate(req)).toEqual({
      routeTemplate: MATCHED_ROUTE_FALLBACK_TEMPLATE,
      matchedRoute: true,
    });
  });

  it("rejects templates containing query/date shapes", () => {
    expect(isTrustedRouteTemplate("/users/me/oura-stress?start=2099-01-02")).toBe(false);
    expect(isTrustedRouteTemplate("/users/UID_SENTINEL_abcdefghijklmnopqrstuv/x")).toBe(false);
  });
});

describe("safeErrorCodeForStatus", () => {
  it("omits codes for success", () => {
    expect(safeErrorCodeForStatus(200)).toBeUndefined();
    expect(safeErrorCodeForStatus(201)).toBeUndefined();
  });

  it("maps common error statuses", () => {
    expect(safeErrorCodeForStatus(400)).toBe("CLIENT_ERROR");
    expect(safeErrorCodeForStatus(401)).toBe("UNAUTHENTICATED");
    expect(safeErrorCodeForStatus(403)).toBe("FORBIDDEN");
    expect(safeErrorCodeForStatus(404)).toBe("NOT_FOUND");
    expect(safeErrorCodeForStatus(500)).toBe("SERVER_ERROR");
  });
});

describe("logApiAccessTelemetry", () => {
  it("emits only allowlisted fields and sanitizes requestId", () => {
    const { events, restore } = captureInfoLogs();
    try {
      const event: ApiAccessTelemetryEvent = {
        operation: "http_request_completed",
        method: "GET",
        routeTemplate: "/users/me/oura-readiness-range",
        statusCode: 200,
        durationMs: 12,
        requestId: SENTINEL.unsafeRequestId,
        authenticated: true,
        matchedRoute: true,
      };
      logApiAccessTelemetry(event);
      expect(events).toHaveLength(1);
      const payload = events[0] as Record<string, unknown>;
      assertApiAccessTelemetryPrivacy(payload);
      expect(payload.operation).toBe("http_request_completed");
      expect(payload.method).toBe("GET");
      expect(payload.routeTemplate).toBe("/users/me/oura-readiness-range");
      expect(payload.statusCode).toBe(200);
      expect(payload.authenticated).toBe(true);
      expect(payload.matchedRoute).toBe(true);
      expect(typeof payload.requestId).toBe("string");
      expect(payload.requestId).not.toBe(SENTINEL.unsafeRequestId);
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain("SENTINEL");
      expect(serialized).not.toContain(SENTINEL.uid);
      expect(serialized).not.toContain(SENTINEL.start);
      expect(serialized).not.toContain(SENTINEL.end);
      expect(serialized).not.toContain("originalUrl");
      expect(serialized).not.toContain("uid");
    } finally {
      restore();
    }
  });

  it("retains a valid UUID requestId", () => {
    const { events, restore } = captureInfoLogs();
    try {
      logApiAccessTelemetry({
        operation: "http_request_completed",
        method: "GET",
        routeTemplate: "/health",
        statusCode: 200,
        durationMs: 1,
        requestId: SAFE_REQUEST_ID,
        authenticated: false,
        matchedRoute: true,
      });
      expect((events[0] as { requestId: string }).requestId).toBe(SAFE_REQUEST_ID);
      assertApiAccessTelemetryPrivacy(events[0]);
    } finally {
      restore();
    }
  });
});

describe("buildApiAccessTelemetryEvent", () => {
  it("sets authenticated from uid presence without logging uid", () => {
    const req = {
      method: "GET",
      baseUrl: "/users/me",
      route: { path: "/oura-stress" },
      rid: SAFE_REQUEST_ID,
      uid: SENTINEL.uid,
      originalUrl: `/users/me/oura-stress?start=${SENTINEL.start}&end=${SENTINEL.end}`,
      query: { start: SENTINEL.start, end: SENTINEL.end },
    } as unknown as Parameters<typeof buildApiAccessTelemetryEvent>[0]["req"];

    const event = buildApiAccessTelemetryEvent({
      req,
      statusCode: 200,
      durationMs: 5,
    });
    expect(event.authenticated).toBe(true);
    expect(event.routeTemplate).toBe("/users/me/oura-stress");
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain(SENTINEL.uid);
    expect(serialized).not.toContain(SENTINEL.start);
    assertApiAccessTelemetryPrivacy({
      msg: "http_request_completed",
      level: "info",
      ...event,
    });
  });
});

async function listen(app: Express): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

describe("accessLogMiddleware integration", () => {
  it("emits one privacy-safe event for authenticated range GET; strips sentinels", async () => {
    const { events, restore } = captureInfoLogs();
    const app = express();
    app.use(requestIdMiddleware);
    app.use(accessLogMiddleware);
    app.use((req, _res, next) => {
      (req as Request & { uid?: string }).uid = SENTINEL.uid;
      next();
    });
    const router = express.Router();
    router.get("/oura-stress", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use("/users/me", router);

    const { baseUrl, close } = await listen(app);
    try {
      const res = await fetch(
        `${baseUrl}/users/me/oura-stress?start=${encodeURIComponent(SENTINEL.start)}&end=${encodeURIComponent(SENTINEL.end)}`,
        {
          headers: {
            Authorization: SENTINEL.authorization,
            "x-api-key": SENTINEL.apiKey,
            "x-request-id": SENTINEL.unsafeRequestId,
          },
        },
      );
      expect(res.status).toBe(200);
      // Response correlation may still echo the unsafe incoming id (HTTP behavior unchanged).
      expect(res.headers.get("x-request-id")).toBe(SENTINEL.unsafeRequestId);

      expect(events.length).toBe(1);
      const payload = events[0] as Record<string, unknown>;
      assertApiAccessTelemetryPrivacy(payload);
      expect(payload.operation).toBe("http_request_completed");
      expect(payload.method).toBe("GET");
      expect(payload.routeTemplate).toBe("/users/me/oura-stress");
      expect(payload.statusCode).toBe(200);
      expect(payload.authenticated).toBe(true);
      expect(payload.matchedRoute).toBe(true);
      expect(payload.requestId).not.toBe(SENTINEL.unsafeRequestId);
      const serialized = JSON.stringify(payload);
      for (const bad of Object.values(SENTINEL)) {
        expect(serialized).not.toContain(bad);
      }
      expect(serialized).not.toContain("uid");
      expect(serialized).not.toContain("originalUrl");
      expect(serialized).not.toContain("query");
    } finally {
      restore();
      await close();
    }
  });

  it.each([
    [200, undefined],
    [201, undefined],
    [400, "CLIENT_ERROR"],
    [401, "UNAUTHENTICATED"],
    [404, "NOT_FOUND"],
    [500, "SERVER_ERROR"],
  ] as const)("status %s maps safeErrorCode %s", async (status, code) => {
    const { events, restore } = captureInfoLogs();
    const app = express();
    app.use(accessLogMiddleware);
    app.get("/health", (_req, res) => {
      res.status(status).end();
    });
    const { baseUrl, close } = await listen(app);
    try {
      await fetch(`${baseUrl}/health`);
      expect(events).toHaveLength(1);
      const payload = events[0] as Record<string, unknown>;
      assertApiAccessTelemetryPrivacy(payload);
      expect(payload.statusCode).toBe(status);
      if (code === undefined) {
        expect(payload.safeErrorCode).toBeUndefined();
      } else {
        expect(payload.safeErrorCode).toBe(code);
      }
    } finally {
      restore();
      await close();
    }
  });

  it("emits UNMATCHED_ROUTE for 404 without logging the raw path", async () => {
    const { events, restore } = captureInfoLogs();
    const app = express();
    app.use(accessLogMiddleware);
    app.use((_req, res) => {
      res.status(404).json({ ok: false });
    });
    const { baseUrl, close } = await listen(app);
    try {
      await fetch(`${baseUrl}/secret-path-${SENTINEL.start}?start=${SENTINEL.start}`);
      expect(events).toHaveLength(1);
      const payload = events[0] as Record<string, unknown>;
      assertApiAccessTelemetryPrivacy(payload);
      expect(payload.routeTemplate).toBe(UNMATCHED_ROUTE_TEMPLATE);
      expect(payload.matchedRoute).toBe(false);
      expect(JSON.stringify(payload)).not.toContain(SENTINEL.start);
      expect(JSON.stringify(payload)).not.toContain("secret-path");
    } finally {
      restore();
      await close();
    }
  });

  it("emits once when finish then close both fire", async () => {
    const { events, restore } = captureInfoLogs();
    const app = express();
    app.use(accessLogMiddleware);
    app.get("/once", (_req, res) => {
      res.status(200).end();
    });
    const { baseUrl, close } = await listen(app);
    try {
      await fetch(`${baseUrl}/once`);
      // Allow close event to settle
      await new Promise((r) => setTimeout(r, 20));
      expect(events).toHaveLength(1);
    } finally {
      restore();
      await close();
    }
  });

  it("logs OPTIONS with normalized method and matched template", async () => {
    const { events, restore } = captureInfoLogs();
    const app = express();
    app.use(accessLogMiddleware);
    app.options("/prefs", (_req, res) => {
      res.status(204).end();
    });
    const { baseUrl, close } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/prefs`, { method: "OPTIONS" });
      expect(res.status).toBe(204);
      expect(events).toHaveLength(1);
      const payload = events[0] as Record<string, unknown>;
      assertApiAccessTelemetryPrivacy(payload);
      expect(payload.method).toBe("OPTIONS");
      expect(payload.routeTemplate).toBe("/prefs");
    } finally {
      restore();
      await close();
    }
  });

  it("preserves x-request-id header when a valid UUID is supplied", async () => {
    const { events, restore } = captureInfoLogs();
    const app = express();
    app.use(requestIdMiddleware);
    app.use(accessLogMiddleware);
    app.get("/ok", (_req, res) => {
      res.status(200).end();
    });
    const { baseUrl, close } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/ok`, {
        headers: { "x-request-id": SAFE_REQUEST_ID },
      });
      expect(res.headers.get("x-request-id")).toBe(SAFE_REQUEST_ID);
      expect((events[0] as { requestId: string }).requestId).toBe(SAFE_REQUEST_ID);
    } finally {
      restore();
      await close();
    }
  });
});

describe("assertApiAccessTelemetryPrivacy", () => {
  it("rejects forbidden keys and values", () => {
    expect(() =>
      assertApiAccessTelemetryPrivacy({
        operation: "http_request_completed",
        uid: "x",
      }),
    ).toThrow(/prohibited key/);

    expect(() =>
      assertApiAccessTelemetryPrivacy({
        operation: "http_request_completed",
        method: "GET",
        routeTemplate: "/x",
        statusCode: 200,
        durationMs: 1,
        requestId: SAFE_REQUEST_ID,
        authenticated: false,
        matchedRoute: true,
        path: "/leak",
      }),
    ).toThrow(/prohibited key/);

    expect(() =>
      assertApiAccessTelemetryPrivacy({
        msg: "http_request_completed",
        operation: "http_request_completed",
        method: "GET",
        routeTemplate: "/x",
        statusCode: 200,
        durationMs: 1,
        requestId: "not-uuid",
        authenticated: false,
        matchedRoute: true,
      }),
    ).toThrow(/strict UUID/);
  });
});
