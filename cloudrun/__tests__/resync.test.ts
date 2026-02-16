/**
 * Unit tests for the resync job (Oura & Withings).
 * Ensures validation, fetch handling, and Firestore writes.
 */

// --- Mock fetch BEFORE resync import ---
const fetchMock = jest.fn();
(global as any).fetch = fetchMock;

// --- Firestore Mock ---
jest.mock("firebase-admin/firestore", () => {
  const setMock = jest.fn().mockResolvedValue(undefined);
  const getMock = jest.fn();

  const docMock = jest.fn(() => ({
    set: setMock,
    get: getMock,
    collection: collectionMock,
  }));

  function collectionMock() {
    return { doc: docMock };
  }

  return {
    getFirestore: () => ({ collection: collectionMock }),
    FieldValue: { serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP") },
    // expose mocks so tests can access them
    __mocks__: { setMock, getMock, docMock },
  };
});

// Import resync AFTER mocks are in place
import { resync } from "../src/jobs/resync";
import type { Request, Response } from "express";

// Helper to pull mocks back out
const { __mocks__ } = jest.requireMock("firebase-admin/firestore") as any;
const { setMock, getMock } = __mocks__;

// --- Helpers ---
function makeMockReqRes(body: any) {
  const req = { body } as unknown as Request;
  const resJson = jest.fn();
  const res = {
    status: jest.fn().mockReturnThis(),
    json: resJson,
  } as unknown as Response;
  return { req, res, resJson };
}

describe("resync job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 if uid/provider missing", async () => {
    const { req, res, resJson } = makeMockReqRes({});
    await resync(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(resJson).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: expect.any(String) })
    );
  });

  it("handles Oura resync with mocked fetch + Firestore", async () => {
    getMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ access_token: "fake_oura_token" }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: "workout123", start_time: "2025-09-01T10:00:00Z" }],
      }),
    });

    const { req, res, resJson } = makeMockReqRes({
      uid: "user1",
      provider: "oura",
    });

    await resync(req, res);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("ouraring.com"),
      expect.any(Object)
    );
    expect(setMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toHaveBeenCalledWith(expect.objectContaining({ ok: true, provider: "oura" }));
  });

  it("handles Withings resync with mocked fetch + Firestore", async () => {
    getMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ access_token: "fake_withings_token" }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        body: { measuregrps: [{ grpid: "grp123", date: Math.floor(Date.now() / 1000) }] },
      }),
    });

    const { req, res, resJson } = makeMockReqRes({
      uid: "user2",
      provider: "withings",
    });

    await resync(req, res);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("withings.net"),
      expect.objectContaining({ method: "POST" })
    );
    expect(setMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toHaveBeenCalledWith(expect.objectContaining({ ok: true, provider: "withings" }));
  });
});
