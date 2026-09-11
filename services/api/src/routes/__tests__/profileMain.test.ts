// services/api/src/routes/__tests__/profileMain.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import profileMainRoutes from "../profileMain";
import { userProfileMainDoc } from "../../db";

jest.mock("../../db", () => ({
  userProfileMainDoc: jest.fn(),
}));

type DocSnap = {
  exists: boolean;
  data: () => unknown;
};

type DocRef = {
  get: () => Promise<DocSnap>;
  set: (data: unknown, opts: unknown) => Promise<void>;
};

describe("GET/PUT /profile/main", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_123";
      next();
    });
    app.use("/profile", profileMainRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("GET returns null when missing and does not write Firestore", async () => {
    const setMock = jest.fn(async () => undefined);
    (userProfileMainDoc as jest.Mock).mockReturnValue({
      get: async () =>
        ({
          exists: false,
          data: () => null,
        }) satisfies DocSnap,
      set: setMock,
    } satisfies DocRef);

    const res = await fetch(`${baseUrl}/profile/main`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toBeNull();
    expect(setMock).not.toHaveBeenCalled();
  });

  test("PUT merges identity fields", async () => {
    const setMock = jest.fn(async () => undefined);
    (userProfileMainDoc as jest.Mock).mockReturnValue({
      get: async () =>
        ({
          exists: true,
          data: () => ({
            identity: { firstName: null, lastName: null, dateOfBirth: null, sexAtBirth: null },
            body: { heightCm: null },
            bodyInputs: {
              athleteMode: false,
              primaryGoal: null,
              usualWeighInPreference: null,
              waistCircumferenceCm: null,
              hipCircumferenceCm: null,
              neckCircumferenceCm: null,
            },
            app: {
              preferredUnits: { length: "cm" },
              onboarding: {
                version: 1,
                status: "not_started",
                step: null,
                completedAt: null,
                updatedAt: null,
              },
            },
          }),
        }) satisfies DocSnap,
      set: setMock,
    } satisfies DocRef);

    const res = await fetch(`${baseUrl}/profile/main`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: { firstName: "Jordan" } }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.identity.firstName).toBe("Jordan");
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT stamps onboarding updatedAt/completedAt server-side and ignores client timestamps", async () => {
    const setMock = jest.fn(async () => undefined);
    (userProfileMainDoc as jest.Mock).mockReturnValue({
      get: async () =>
        ({
          exists: true,
          data: () => ({
            identity: { firstName: null, lastName: null, dateOfBirth: null, sexAtBirth: null },
            body: { heightCm: null },
            bodyInputs: {
              athleteMode: false,
              primaryGoal: null,
              usualWeighInPreference: null,
              waistCircumferenceCm: null,
              hipCircumferenceCm: null,
              neckCircumferenceCm: null,
            },
            app: {
              preferredUnits: { length: "cm" },
              onboarding: {
                version: 1,
                status: "in_progress",
                step: "understand",
                completedAt: null,
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            },
          }),
        }) satisfies DocSnap,
      set: setMock,
    } satisfies DocRef);

    const res = await fetch(`${baseUrl}/profile/main`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: {
          onboarding: {
            status: "completed",
            step: "understand",
            completedAt: "2000-01-01T00:00:00.000Z",
            updatedAt: "2000-01-01T00:00:00.000Z",
          },
        },
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.app.onboarding.status).toBe("completed");
    expect(json.app.onboarding.completedAt).not.toBe("2000-01-01T00:00:00.000Z");
    expect(json.app.onboarding.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
    expect(typeof json.app.onboarding.completedAt).toBe("string");
    expect(typeof json.app.onboarding.updatedAt).toBe("string");
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT creates profile/main when document is missing", async () => {
    const setMock = jest.fn(async () => undefined);
    (userProfileMainDoc as jest.Mock).mockReturnValue({
      get: async () =>
        ({
          exists: false,
          data: () => null,
        }) satisfies DocSnap,
      set: setMock,
    } satisfies DocRef);

    const res = await fetch(`${baseUrl}/profile/main`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: { firstName: "New" } }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.identity.firstName).toBe("New");
    expect(setMock).toHaveBeenCalled();
  });
});
