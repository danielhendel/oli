import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockOnDocumentCreated = jest.fn((_: unknown, handler: unknown) => handler);
const mockRecompute: jest.Mock = jest.fn(async () => undefined);

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: (opts: unknown, handler: unknown) => mockOnDocumentCreated(opts, handler),
}));

jest.mock("../../pipeline/recomputeForDay", () => ({
  recomputeDerivedTruthForDay: (input: unknown) => mockRecompute(input),
}));

jest.mock("../../firebaseAdmin", () => ({ db: {} }));
jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("onCanonicalEventCreated", () => {
  beforeEach(() => {
    mockOnDocumentCreated.mockClear();
    mockRecompute.mockClear();
    jest.resetModules();
  });

  it("delegates realtime recompute to shared pipeline for non-steps canonicals", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../onCanonicalEventCreated");
    const handler = mod.onCanonicalEventCreated as (event: unknown) => Promise<void>;
    await handler({
      params: { userId: "u1", eventId: "e1" },
      data: { data: () => ({ day: "2026-03-31", kind: "sleep" }) },
    });
    expect(mockRecompute).toHaveBeenCalledWith({
      db: {},
      userId: "u1",
      dayKey: "2026-03-31",
      trigger: { type: "realtime", eventId: "e1" },
    });
  });

  it("does not recompute for steps (normalization owns derived truth for steps)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../onCanonicalEventCreated");
    const handler = mod.onCanonicalEventCreated as (event: unknown) => Promise<void>;
    await handler({
      params: { userId: "u1", eventId: "e1" },
      data: { data: () => ({ day: "2026-03-31", kind: "steps" }) },
    });
    expect(mockRecompute).not.toHaveBeenCalled();
  });
});

