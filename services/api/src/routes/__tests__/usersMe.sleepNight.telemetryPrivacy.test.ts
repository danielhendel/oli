/**
 * Logger-capture privacy tests for SleepNight route telemetry.
 * Synthetic fixtures only — never assert by printing real staging values.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

jest.mock("../../lib/sleepNightRead", () => ({
  loadSleepNightView: jest.fn(),
  loadSleepNightViewsForRange: jest.fn(),
}));

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import { loadSleepNightView, loadSleepNightViewsForRange } from "../../lib/sleepNightRead";
import usersMeRoutes from "../usersMe";
import * as loggerModule from "../../lib/logger";
import { assertSleepNightRouteTelemetryPrivacy } from "../../lib/testSupport/assertSleepNightRouteTelemetryPrivacy";

const mockLoad = loadSleepNightView as jest.MockedFunction<typeof loadSleepNightView>;
const mockLoadRange = loadSleepNightViewsForRange as jest.MockedFunction<
  typeof loadSleepNightViewsForRange
>;

const SENTINEL = {
  uid: "UID_SENTINEL_abcdefghijklmnopqrstuv",
  day: "2099-01-02",
  start: "2099-01-01",
  end: "2099-01-03",
  bearer: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SENTINEL.sig",
  apiKey: "AIzaSySENTINEL_KEY_VALUE_XXXX",
} as const;

function captureInfoLogs(): { events: Record<string, unknown>[]; restore: () => void } {
  const events: Record<string, unknown>[] = [];
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

function sleepNightRouteEvents(events: Record<string, unknown>[]): Record<string, unknown>[] {
  return events.filter(
    (e) =>
      e.msg === "[SLEEP_NIGHT_ROUTE_VERSION]" || e.msg === "[SLEEP_NIGHT_RANGE_ROUTE]",
  );
}

function assertNoSentinelLeak(events: Record<string, unknown>[]): void {
  const blob = JSON.stringify(events);
  expect(blob).not.toContain(SENTINEL.uid);
  expect(blob).not.toContain(SENTINEL.day);
  expect(blob).not.toContain(SENTINEL.start);
  expect(blob).not.toContain(SENTINEL.end);
  expect(blob).not.toContain(SENTINEL.bearer);
  expect(blob).not.toContain(SENTINEL.apiKey);
  expect(blob).not.toContain("eyJ");
  expect(blob).not.toMatch(/\d{4}-\d{2}-\d{2}/);
}

describe("SleepNight route telemetry privacy (logger capture)", () => {
  let server: http.Server;
  let baseUrl: string;
  let unauthServer: http.Server;
  let unauthBaseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = SENTINEL.uid;
      next();
    });
    app.use("/users/me", usersMeRoutes);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const unauthApp = express();
    unauthApp.use("/users/me", usersMeRoutes);
    unauthServer = unauthApp.listen(0);
    unauthBaseUrl = `http://127.0.0.1:${(unauthServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => unauthServer.close(() => resolve()));
  });

  beforeEach(() => {
    mockLoad.mockReset();
    mockLoadRange.mockReset();
  });

  it("emits one privacy-safe version event on authenticated success", async () => {
    mockLoad.mockResolvedValue({
      requestedDay: SENTINEL.day,
      anchorDay: SENTINEL.day,
      wakeDay: SENTINEL.day,
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: {
        anchorDay: SENTINEL.day,
        wakeDay: SENTINEL.day,
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "doc_SENTINEL",
        score: 88,
        isComplete: true,
        totalSleepMinutes: 400,
        updatedAt: "2099-01-02T12:00:00.000Z",
      },
    });

    const cap = captureInfoLogs();
    try {
      const res = await fetch(`${baseUrl}/users/me/sleep-night?day=${SENTINEL.day}`);
      expect(res.status).toBe(200);
      const routeEvents = sleepNightRouteEvents(cap.events);
      expect(routeEvents).toHaveLength(1);
      expect(routeEvents[0]).toEqual({
        msg: "[SLEEP_NIGHT_ROUTE_VERSION]",
        version: "sleep-night-resolution-v2",
      });
      assertSleepNightRouteTelemetryPrivacy(routeEvents[0]);
      assertNoSentinelLeak(routeEvents);
    } finally {
      cap.restore();
    }
  });

  it("emits one privacy-safe version event on authenticated sparse/no-data (404)", async () => {
    mockLoad.mockResolvedValue(null);
    const cap = captureInfoLogs();
    try {
      const res = await fetch(`${baseUrl}/users/me/sleep-night?day=${SENTINEL.day}`);
      expect(res.status).toBe(404);
      const routeEvents = sleepNightRouteEvents(cap.events);
      expect(routeEvents).toHaveLength(1);
      expect(routeEvents[0]).toEqual({
        msg: "[SLEEP_NIGHT_ROUTE_VERSION]",
        version: "sleep-night-resolution-v2",
      });
      assertSleepNightRouteTelemetryPrivacy(routeEvents[0]);
      assertNoSentinelLeak(routeEvents);
    } finally {
      cap.restore();
    }
  });

  it("emits no SleepNight route-version event on invalid day", async () => {
    const cap = captureInfoLogs();
    try {
      const res = await fetch(`${baseUrl}/users/me/sleep-night?day=not-a-day`);
      expect(res.status).toBe(400);
      expect(sleepNightRouteEvents(cap.events)).toHaveLength(0);
    } finally {
      cap.restore();
    }
  });

  it("emits no SleepNight route-version event when unauthenticated", async () => {
    const cap = captureInfoLogs();
    try {
      const res = await fetch(`${unauthBaseUrl}/users/me/sleep-night?day=${SENTINEL.day}`);
      expect(res.status).toBe(401);
      expect(sleepNightRouteEvents(cap.events)).toHaveLength(0);
    } finally {
      cap.restore();
    }
  });

  it("range route emits aggregate-only dayCount telemetry", async () => {
    mockLoadRange.mockResolvedValue([]);
    const cap = captureInfoLogs();
    try {
      const res = await fetch(
        `${baseUrl}/users/me/sleep-nights?start=${SENTINEL.start}&end=${SENTINEL.end}`,
      );
      expect(res.status).toBe(200);
      const routeEvents = sleepNightRouteEvents(cap.events);
      expect(routeEvents).toHaveLength(1);
      expect(routeEvents[0]).toEqual({
        msg: "[SLEEP_NIGHT_RANGE_ROUTE]",
        version: "sleep-night-range-v1",
        dayCount: 3,
      });
      assertSleepNightRouteTelemetryPrivacy(routeEvents[0]);
      assertNoSentinelLeak(routeEvents);
    } finally {
      cap.restore();
    }
  });
});
