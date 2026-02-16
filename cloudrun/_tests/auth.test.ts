// cloudrun/_tests/auth.test.ts
import type { Request, Response, NextFunction } from "express";
import { requireFirebaseUser } from "../src/middleware/auth";

// Mock firebase-admin with an in-factory variable so Jest hoisting is happy
jest.mock("firebase-admin", () => {
  const mockVerifyIdToken = jest.fn();
  return {
    initializeApp: jest.fn(),
    auth: () => ({ verifyIdToken: mockVerifyIdToken }),
    // expose for tests
    __TESTS__: { mockVerifyIdToken },
  };
});

// Pull the mock handle out of the mocked module
const { __TESTS__ } = require("firebase-admin") as {
  __TESTS__: { mockVerifyIdToken: jest.Mock };
};
const verifyIdToken = __TESTS__.mockVerifyIdToken;

function make(headerVal?: string) {
  const req = {
    get: (name: string) =>
      name.toLowerCase() === "authorization" ? headerVal : undefined,
  } as unknown as Request;

  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res = { status, json } as unknown as Response;

  const next = jest.fn() as unknown as NextFunction;
  return { req, res, next, status, json };
}

describe("requireFirebaseUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts valid token", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "u_123" });
    const { req, res, next } = make("Bearer good.token.here");

    await requireFirebaseUser(req, res, next);

    expect(verifyIdToken).toHaveBeenCalledWith("good.token.here", true);
    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).firebaseUid).toBe("u_123"); // added dynamically by middleware
  });

  it("rejects when header missing", async () => {
    const { req, res, next, status, json } = make(undefined);

    await requireFirebaseUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ ok: false, error: "Missing bearer token" });
  });

  it("rejects when verification fails", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("bad token"));
    const { req, res, next, status, json } = make("Bearer bad.token.here");

    await requireFirebaseUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ ok: false, error: "Invalid token" });
  });
});
