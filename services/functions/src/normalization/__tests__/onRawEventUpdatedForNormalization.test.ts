import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const mockOnDocumentUpdated = jest.fn();
const mockProcess = jest.fn(async (params: unknown) => {
  void params;
  return undefined;
});

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentUpdated: (opts: unknown, handler: unknown) => mockOnDocumentUpdated(opts, handler),
}));

jest.mock("firebase-functions/logger", () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../processRawEventForNormalization", () => ({
  processRawEventForNormalization: (params: unknown) => mockProcess(params),
}));

describe("onRawEventUpdatedForNormalization", () => {
  let handler: ((event: unknown) => Promise<void>) | undefined;

  beforeEach(() => {
    mockOnDocumentUpdated.mockReset();
    mockProcess.mockClear();
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../onRawEventUpdatedForNormalization");
    handler = mockOnDocumentUpdated.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;
  });

  it("processes steps updates with trigger=update", async () => {
    expect(mockOnDocumentUpdated).toHaveBeenCalledTimes(1);
    expect(typeof handler).toBe("function");

    const afterSnap = {
      data: () => ({ kind: "steps" }),
    };

    await handler?.({
      params: { userId: "u1", rawEventId: "r1" },
      data: { after: afterSnap },
    });

    expect(mockProcess).toHaveBeenCalledTimes(1);
    expect(mockProcess).toHaveBeenCalledWith({
      snapshot: afterSnap,
      pathUserId: "u1",
      rawEventId: "r1",
      trigger: "update",
    });
  });

  it("processes sleep updates with trigger=update", async () => {
    const afterSnap = { data: () => ({ kind: "sleep" }) };
    await handler?.({
      params: { userId: "u1", rawEventId: "r-sleep" },
      data: { after: afterSnap },
    });
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });

  it("processes workout updates with trigger=update (Workout Physiology v1)", async () => {
    const afterSnap = { data: () => ({ kind: "workout" }) };
    await handler?.({
      params: { userId: "u1", rawEventId: "r-workout" },
      data: { after: afterSnap },
    });
    expect(mockProcess).toHaveBeenCalledTimes(1);
    expect(mockProcess).toHaveBeenCalledWith({
      snapshot: afterSnap,
      pathUserId: "u1",
      rawEventId: "r-workout",
      trigger: "update",
    });
  });

  it("does NOT widen to strength_workout in Phase B", async () => {
    await handler?.({
      params: { userId: "u1", rawEventId: "r-strength" },
      data: { after: { data: () => ({ kind: "strength_workout" }) } },
    });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it("ignores other kinds (nutrition, hrv, weight, …)", async () => {
    await handler?.({
      params: { userId: "u1", rawEventId: "r-other" },
      data: { after: { data: () => ({ kind: "nutrition" }) } },
    });
    expect(mockProcess).not.toHaveBeenCalled();
  });
});

