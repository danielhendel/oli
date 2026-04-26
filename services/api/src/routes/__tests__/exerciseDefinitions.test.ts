jest.mock("../../firebaseAdmin", () => ({
  admin: {
    storage: jest.fn(() => ({
      bucket: jest.fn(() => ({
        file: jest.fn(() => ({
          save: jest.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
  },
}));

import express from "express";
import type http from "http";
import { AddressInfo } from "net";
import { ZodError } from "zod";
import { exerciseDefinitionMediaUploadResponseSchema } from "@oli/contracts";

import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";
import { admin } from "../../firebaseAdmin";
import { requestIdMiddleware } from "../../lib/logger";
import exerciseDefinitionMediaUploadRoutes from "../exerciseDefinitionMediaUpload";
import exerciseDefinitionsRoutes from "../exerciseDefinitions";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

type DocSnap = { exists: boolean; data: () => unknown };
type DocRef = { get: () => Promise<DocSnap>; set: (data: unknown, opts?: unknown) => Promise<void> };
type QuerySnap = { docs: { id: string; data: () => unknown }[] };
type ColRef = { get: () => Promise<QuerySnap>; doc: (id: string) => DocRef };

describe("exerciseDefinitions routes", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.FIREBASE_STORAGE_BUCKET = "unit-test-bucket";
    const app = express();
    app.use(requestIdMiddleware);
    app.use(express.json({ limit: "5mb" }));
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_ab12cd34";
      next();
    });
    app.use("/exercise-definitions", exerciseDefinitionMediaUploadRoutes);
    app.use("/exercise-definitions", exerciseDefinitionsRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    // clearAllMocks preserves mock implementations from jest.mock factories; resetAllMocks
    // strips admin.storage() and breaks exercise media upload tests that hit Storage.
    jest.clearAllMocks();
  });

  test("GET returns empty items when collection empty", async () => {
    (userCollection as jest.Mock).mockReturnValue({
      get: async () => ({ docs: [] }),
    } satisfies ColRef);

    const res = await fetch(`${baseUrl}/exercise-definitions`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: unknown[] };
    expect(json.items).toEqual([]);
  });

  test("POST creates document with stable migrated id", async () => {
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      get: async () => ({ docs: [] }),
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: setMock,
      }),
    } satisfies ColRef);

    const body = {
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      exerciseId: "custom_userab12_z_press",
    };

    const res = await fetch(`${baseUrl}/exercise-definitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { exerciseId: string; name: string };
    expect(json.exerciseId).toBe("custom_userab12_z_press");
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT updates existing row", async () => {
    const existing = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => existing }),
        set: setMock,
      }),
    } satisfies Pick<ColRef, "doc">);

    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Z-Press" }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { name: string };
    expect(json.name).toBe("Z-Press");
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT updates taxonomy extension fields", async () => {
    const existing = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => existing }),
        set: setMock,
      }),
    } satisfies Pick<ColRef, "doc">);

    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementPattern: "push",
          aliases: ["z press", "z-press"],
          primaryMusclesDetailed: ["DeltsAnterior"],
        }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { movementPattern?: string; aliases?: string[] };
    expect(json.movementPattern).toBe("push");
    expect(json.aliases).toEqual(["z press", "z-press"]);
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT merges stability and laterality without dropping existing taxonomy fields", async () => {
    const existing = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      movementPattern: "push",
      muscleContributions: [{ subgroup: "front_delts", weight: 0.7 }],
    };
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => existing }),
        set: setMock,
      }),
    } satisfies Pick<ColRef, "doc">);

    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stability: "free",
          laterality: "unilateral",
        }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      movementPattern?: string;
      muscleContributions?: { subgroup: string; weight: number }[];
      stability?: string;
      laterality?: string;
    };
    expect(json.stability).toBe("free");
    expect(json.laterality).toBe("unilateral");
    expect(json.movementPattern).toBe("push");
    expect(json.muscleContributions).toEqual([{ subgroup: "front_delts", weight: 0.7 }]);
    expect(setMock).toHaveBeenCalled();
    const written = setMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written?.["movementPattern"]).toBe("push");
    expect(written?.["muscleContributions"]).toEqual([{ subgroup: "front_delts", weight: 0.7 }]);
  });

  test("PUT clears stability and laterality when null", async () => {
    const existing = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      stability: "machine",
      laterality: "bilateral",
    };
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => existing }),
        set: setMock,
      }),
    } satisfies Pick<ColRef, "doc">);

    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stability: null, laterality: null }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { stability?: unknown; laterality?: unknown };
    expect(json.stability).toBeNull();
    expect(json.laterality).toBeNull();
    const written = setMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written?.["stability"]).toBeNull();
    expect(written?.["laterality"]).toBeNull();
  });

  describe("POST /exercise-definitions/:exerciseId/media", () => {
    beforeEach(() => {
      allowConsoleForThisTest({ error: [/exercise_definition_media_/] });
    });

    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const existingZPress = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    test("POST media returns 404 when exercise definition is missing", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: false, data: () => null }),
        }),
      } satisfies Pick<ColRef, "doc">);

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": "req-media-notfound-1",
            "x-cloud-trace-context": "abc/1;o=1",
          },
          body: JSON.stringify({
            slot: "image",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as { error?: { requestId?: string; trace?: string } };
      expect(json.error?.requestId).toBe("req-media-notfound-1");
      expect(json.error?.trace).toBe("abc/1;o=1");
    });

    test("POST media returns 400 for invalid MIME", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "image",
            fileBase64: "YQo=",
            mimeType: "application/pdf",
            filename: "x.pdf",
          }),
        },
      );
      expect(res.status).toBe(400);
    });

    test("POST media returns 400 for invalid slot (body validation)", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "thumbnail",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string } };
      expect(json.ok).toBe(false);
      expect(json.error?.code).toBe("INVALID_BODY");
    });

    test("POST media returns 200 with url and slot when definition exists", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "image",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { url: string; slot: string };
      expect(json.slot).toBe("image");
      expect(json.url).toContain("firebasestorage.googleapis.com");
      expect(json.url).toContain(encodeURIComponent("unit-test-bucket"));
    });

    test("POST media returns 500 FIRESTORE_READ_FAILED when Firestore get throws", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => {
            throw new Error("firestore_simulated_failure");
          },
        }),
      } satisfies Pick<ColRef, "doc">);

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "image",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(500);
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
      expect(json.ok).toBe(false);
      expect(json.error?.code).toBe("FIRESTORE_READ_FAILED");
      expect(json.error?.message).toBe("Could not load exercise definition");
    });

    test("POST media returns 500 STORAGE_CONFIG when bucket cannot be resolved", async () => {
      const prevBucket = process.env.FIREBASE_STORAGE_BUCKET;
      const prevGcp = process.env.GOOGLE_CLOUD_PROJECT;
      const prevFbp = process.env.FIREBASE_PROJECT_ID;
      const prevGc = process.env.GCLOUD_PROJECT;
      delete process.env.FIREBASE_STORAGE_BUCKET;
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.GCLOUD_PROJECT;
      try {
        (userCollection as jest.Mock).mockReturnValue({
          doc: () => ({
            get: async () => ({ exists: true, data: () => existingZPress }),
          }),
        } satisfies Pick<ColRef, "doc">);

        const res = await fetch(
          `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slot: "image",
              fileBase64: tinyPng,
              mimeType: "image/png",
              filename: "dot.png",
            }),
          },
        );
        expect(res.status).toBe(500);
        const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
        expect(json.error?.code).toBe("STORAGE_CONFIG");
        expect(json.error?.message).toBe("Exercise media upload is temporarily unavailable");
      } finally {
        if (prevBucket !== undefined) process.env.FIREBASE_STORAGE_BUCKET = prevBucket;
        else process.env.FIREBASE_STORAGE_BUCKET = "unit-test-bucket";
        if (prevGcp !== undefined) process.env.GOOGLE_CLOUD_PROJECT = prevGcp;
        if (prevFbp !== undefined) process.env.FIREBASE_PROJECT_ID = prevFbp;
        if (prevGc !== undefined) process.env.GCLOUD_PROJECT = prevGc;
      }
    });

    test("POST media returns 200 when FIREBASE_STORAGE_BUCKET unset but GOOGLE_CLOUD_PROJECT derives bucket", async () => {
      const prevBucket = process.env.FIREBASE_STORAGE_BUCKET;
      const prevGcp = process.env.GOOGLE_CLOUD_PROJECT;
      const prevFbp = process.env.FIREBASE_PROJECT_ID;
      const prevGc = process.env.GCLOUD_PROJECT;
      delete process.env.FIREBASE_STORAGE_BUCKET;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.GCLOUD_PROJECT;
      process.env.GOOGLE_CLOUD_PROJECT = "unit_test_gcp_proj";
      try {
        (userCollection as jest.Mock).mockReturnValue({
          doc: () => ({
            get: async () => ({ exists: true, data: () => existingZPress }),
          }),
        } satisfies Pick<ColRef, "doc">);

        const res = await fetch(
          `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slot: "image",
              fileBase64: tinyPng,
              mimeType: "image/png",
              filename: "dot.png",
            }),
          },
        );
        expect(res.status).toBe(200);
        const json = (await res.json()) as { url: string; slot: string };
        expect(json.slot).toBe("image");
        expect(json.url).toContain("firebasestorage.googleapis.com");
        expect(json.url).toContain(encodeURIComponent("unit_test_gcp_proj.firebasestorage.app"));
      } finally {
        if (prevBucket !== undefined) process.env.FIREBASE_STORAGE_BUCKET = prevBucket;
        else process.env.FIREBASE_STORAGE_BUCKET = "unit-test-bucket";
        if (prevGcp !== undefined) process.env.GOOGLE_CLOUD_PROJECT = prevGcp;
        else delete process.env.GOOGLE_CLOUD_PROJECT;
        if (prevFbp !== undefined) process.env.FIREBASE_PROJECT_ID = prevFbp;
        if (prevGc !== undefined) process.env.GCLOUD_PROJECT = prevGc;
      }
    });

    test("POST media returns 500 STORAGE_INIT_FAILED when admin.storage throws", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      (admin.storage as jest.Mock).mockImplementationOnce(() => {
        throw new Error("storage_api_unavailable");
      });

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "image",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(500);
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
      expect(json.error?.code).toBe("STORAGE_INIT_FAILED");
      expect(json.error?.message).toBe("Could not upload exercise media");
    });

    test("POST media returns 500 STORAGE_INIT_FAILED when admin.storage returns nullish", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      (admin.storage as jest.Mock).mockReturnValueOnce(null);

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "image",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(500);
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string } };
      expect(json.error?.code).toBe("STORAGE_INIT_FAILED");
    });

    test("POST media returns 500 STORAGE_UPLOAD_FAILED when Storage save rejects", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      (admin.storage as jest.Mock).mockImplementationOnce(() => ({
        bucket: jest.fn(() => ({
          file: jest.fn(() => ({
            save: jest.fn().mockRejectedValueOnce(new Error("gcs_write_denied")),
          })),
        })),
      }));

      const res = await fetch(
        `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: "image",
            fileBase64: tinyPng,
            mimeType: "image/png",
            filename: "dot.png",
          }),
        },
      );
      expect(res.status).toBe(500);
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
      expect(json.error?.code).toBe("STORAGE_UPLOAD_FAILED");
      expect(json.error?.message).toBe("Could not upload exercise media");
    });

    test("POST media returns 500 DOWNLOAD_URL_FAILED when URL build throws", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      const encSpy = jest.spyOn(global, "encodeURIComponent").mockImplementationOnce(() => {
        throw new Error("encodeURIComponent_simulated");
      });
      try {
        const res = await fetch(
          `${baseUrl}/exercise-definitions/custom_userab12_z_press/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slot: "image",
              fileBase64: tinyPng,
              mimeType: "image/png",
              filename: "dot.png",
            }),
          },
        );
        expect(res.status).toBe(500);
        const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
        expect(json.error?.code).toBe("DOWNLOAD_URL_FAILED");
        expect(json.error?.message).toBe("Could not finalize exercise media upload");
      } finally {
        encSpy.mockRestore();
      }
    });

    test("POST media returns 500 MEDIA_RESPONSE_INVALID when response schema rejects", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: async () => ({ exists: true, data: () => existingZPress }),
        }),
      } satisfies Pick<ColRef, "doc">);

      const spy = jest.spyOn(exerciseDefinitionMediaUploadResponseSchema, "safeParse").mockReturnValueOnce({
        success: false,
        error: new ZodError([]),
      } as ReturnType<typeof exerciseDefinitionMediaUploadResponseSchema.safeParse>);

      try {
        const res = await fetch(
          `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slot: "image",
              fileBase64: tinyPng,
              mimeType: "image/png",
              filename: "dot.png",
            }),
          },
        );
        expect(res.status).toBe(500);
        const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
        expect(json.error?.code).toBe("MEDIA_RESPONSE_INVALID");
        expect(json.error?.message).toBe("Could not finalize exercise media upload");
      } finally {
        spy.mockRestore();
      }
    });
  });
});

describe("exerciseDefinitionMediaUpload without req.uid", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.FIREBASE_STORAGE_BUCKET = "unit-test-bucket";
    const app = express();
    app.use(express.json({ limit: "5mb" }));
    app.use("/exercise-definitions", exerciseDefinitionMediaUploadRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("POST media returns 401 when uid is missing", async () => {
    allowConsoleForThisTest({ error: [/exercise_definition_media_/] });
    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: "image",
          fileBase64: tinyPng,
          mimeType: "image/png",
          filename: "dot.png",
        }),
      },
    );
    expect(res.status).toBe(401);
    const json = (await res.json()) as { ok?: boolean; error?: { code?: string } };
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe("UNAUTHORIZED");
  });
});
