// services/api/src/routes/__tests__/failures.proof.test.ts
//
// Phase 1 Failure Memory proof test:
// 1) Simulate a failure record under users/{uid}/failures (via mock)
// 2) Prove the API endpoint returns it
//
// With Firestore emulator: same test could use real writes; mock allows CI without Java.

import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

const mockUserCollection = userCollection as jest.Mock;

describe("Failure Memory — Phase 1 proof", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();

    // Inject authenticated uid
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_failure_proof_123";
      next();
    });

    app.use("/users/me", usersMeRoutes);

    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    mockUserCollection.mockReset();
  });

  it("returns failures from users/{uid}/failures when API is queried", async () => {
    const uid = "user_failure_proof_123";
    const day = "2025-01-15";
    const failureId = "proof_test_failure_001";

    const failureDoc = {
      userId: uid,
      source: "normalization",
      stage: "rawEvent.validate",
      reasonCode: "RAW_EVENT_INVALID",
      message: "RawEvent failed contract validation",
      day,
      rawEventId: "raw_test_deterministic_1",
      details: { formErrors: ["test proof"], fieldErrors: {} },
      createdAt: { toDate: () => new Date("2025-01-15T12:00:00.000Z") },
    };

    const mockGet = jest.fn().mockResolvedValue({
      docs: [
        {
          id: failureId,
          data: () => failureDoc,
        },
      ],
    });

    mockUserCollection.mockReturnValue({
      where: () => ({
        orderBy: () => ({
          limit: () => ({
            get: mockGet,
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/failures?day=${day}`);

    expect(res.status).toBe(200);

    const json = (await res.json()) as { items: Record<string, unknown>[] };

    expect(json.items).toBeDefined();
    expect(Array.isArray(json.items)).toBe(true);

    const found = json.items.find((f) => f.id === failureId);
    expect(found).toBeDefined();
    expect(found?.type).toBe("normalization");
    expect(found?.code).toBe("RAW_EVENT_INVALID");
    expect(found?.message).toBe("RawEvent failed contract validation");
    expect(found?.day).toBe(day);
    expect(found?.rawEventId).toBe("raw_test_deterministic_1");
    expect(found?.createdAt).toBeDefined();

    expect(mockUserCollection).toHaveBeenCalledWith(uid, "failures");
  });
});
