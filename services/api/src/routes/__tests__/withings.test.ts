/**
 * Phase 3A — Withings integration API tests.
 * - Callback is reachable without auth (no 401); connect requires auth (401 without).
 * - /api alias behaves same as canonical paths.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import type { AddressInfo } from "net";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  userDoc: jest.fn(),
}));

import { withingsPublicRoutes, withingsAuthedRoutes } from "../withings";

function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  // Canonical
  app.use("/integrations/withings", withingsPublicRoutes);
  app.use(
    "/integrations/withings",
    (req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_withings_test";
      next();
    },
    withingsAuthedRoutes,
  );
  // /api alias
  app.use("/api/integrations/withings", withingsPublicRoutes);
  app.use(
    "/api/integrations/withings",
    (req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_withings_test";
      next();
    },
    withingsAuthedRoutes,
  );
  return app;
}

describe("Withings integration routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("GET .../callback (public, no auth)", () => {
    it("is reachable without auth and returns 400 for missing params (not 401)", async () => {
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/integrations/withings/callback`, {
          method: "GET",
        });
        expect(res.status).not.toBe(401);
        expect(res.status).toBe(400);
        const json = (await res.json()) as { ok: boolean; error?: { code: string } };
        expect(json.ok).toBe(false);
        expect(json.error?.code).toBe("INVALID_CALLBACK");
      } finally {
        server.close();
      }
    });

    it("same behavior on /api alias", async () => {
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/api/integrations/withings/callback`, {
          method: "GET",
        });
        expect(res.status).not.toBe(401);
        expect(res.status).toBe(400);
        const json = (await res.json()) as { ok: boolean; error?: { code: string } };
        expect(json.ok).toBe(false);
        expect(json.error?.code).toBe("INVALID_CALLBACK");
      } finally {
        server.close();
      }
    });
  });

  describe("POST .../callback (public no-op)", () => {
    it("returns 200 without auth (gateway allows POST; Withings portal Test)", async () => {
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/integrations/withings/callback`, {
          method: "POST",
        });
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe("OK");
      } finally {
        server.close();
      }
    });
  });

  describe("HEAD .../callback (public no-op)", () => {
    it("returns 200 without auth (gateway allows HEAD)", async () => {
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/integrations/withings/callback`, {
          method: "HEAD",
        });
        expect(res.status).toBe(200);
      } finally {
        server.close();
      }
    });
  });

  describe("POST .../connect (authed)", () => {
    it("returns 401 without auth", async () => {
      const app = express();
      app.use(express.json());
      app.use("/integrations/withings", withingsPublicRoutes);
      app.use("/integrations/withings", withingsAuthedRoutes);
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/integrations/withings/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(401);
      } finally {
        server.close();
      }
    });

    it("returns OAuth URL when env is configured and uid present", async () => {
      process.env.WITHINGS_CLIENT_ID = "test_client";
      process.env.WITHINGS_REDIRECT_URI = "https://app.example.com/callback";
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/integrations/withings/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as { ok: boolean; url?: string };
        expect(json.ok).toBe(true);
        expect(typeof json.url).toBe("string");
        expect((json.url as string).length).toBeGreaterThan(0);
        expect(json.url).toContain("account.withings.com");
        expect(json.url).toContain("client_id=test_client");
        expect(json.url).toContain("scope=user.metrics");
        expect((json.url as string).startsWith("https://")).toBe(true);
      } finally {
        server.close();
      }
    });

    it("returns 503 when env is missing", async () => {
      delete process.env.WITHINGS_CLIENT_ID;
      delete process.env.WITHINGS_REDIRECT_URI;
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/integrations/withings/connect`, {
          method: "POST",
        });
        expect(res.status).toBe(503);
        const json = (await res.json()) as { ok: boolean; error?: { code: string } };
        expect(json.ok).toBe(false);
        expect(json.error?.code).toBe("INTEGRATION_UNAVAILABLE");
      } finally {
        server.close();
      }
    });

    it("/api alias connect returns same OAuth URL when env configured", async () => {
      process.env.WITHINGS_CLIENT_ID = "test_client";
      process.env.WITHINGS_REDIRECT_URI = "https://app.example.com/api/callback";
      const app = createApp();
      const server = app.listen(0);
      const addr = server.address() as AddressInfo;
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/api/integrations/withings/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as { ok: boolean; url?: string };
        expect(json.ok).toBe(true);
        expect(json.url).toContain("account.withings.com");
        expect(json.url).toContain("client_id=test_client");
      } finally {
        server.close();
      }
    });
  });
});
