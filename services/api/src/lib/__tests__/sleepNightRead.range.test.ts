jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import type { SleepNightDocumentDto } from "@oli/contracts/sleepNight";
import { loadSleepNightViewsForRange } from "../sleepNightRead";

const userCollection = jest.requireMock("../../db").userCollection as jest.Mock;
const documentIdPath = jest.requireMock("../../db").documentIdPath;

function nightDoc(
  over: Partial<SleepNightDocumentDto> & Pick<SleepNightDocumentDto, "anchorDay" | "wakeDay">,
): SleepNightDocumentDto {
  return {
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "src",
    isComplete: true,
    updatedAt: "2026-05-01T12:00:00.000Z",
    score: 80,
    totalSleepMinutes: 400,
    ...over,
  };
}

function mockSleepNightsOnly(docs: Record<string, SleepNightDocumentDto>) {
  const sleepDocGet = jest.fn(async () => {
    throw new Error("per-doc sleepNights.get() must not be used for range prefetch");
  });
  const rangeGet = jest.fn(async () => ({
    docs: Object.entries(docs).map(([id, data]) => ({
      id,
      data: () => data as unknown as Record<string, unknown>,
    })),
  }));
  const whereCalls: { field: unknown; op: string; value: string }[] = [];
  const calledCollections: string[] = [];

  userCollection.mockImplementation((_uid: string, name: string) => {
    calledCollections.push(name);
    if (name === "sleepNights") {
      const chain: {
        where: (field: unknown, op: string, value: string) => typeof chain;
        get: typeof rangeGet;
        doc: () => { get: typeof sleepDocGet };
      } = {
        where: (field, op, value) => {
          whereCalls.push({ field, op, value });
          return chain;
        },
        get: rangeGet,
        doc: () => ({ get: sleepDocGet }),
      };
      return chain;
    }
    throw new Error(`range loader must not open collection "${name}"`);
  });

  return { sleepDocGet, rangeGet, whereCalls, calledCollections };
}

describe("loadSleepNightViewsForRange", () => {
  beforeEach(() => {
    userCollection.mockReset();
  });

  it("uses one document-ID range query and opens only sleepNights (no hydrate I/O)", async () => {
    const docs: Record<string, SleepNightDocumentDto> = {
      "2026-05-03": nightDoc({
        anchorDay: "2026-05-03",
        wakeDay: "2026-05-03",
        score: 88,
      }),
    };
    const { sleepDocGet, rangeGet, whereCalls, calledCollections } = mockSleepNightsOnly(docs);

    const nights = await loadSleepNightViewsForRange("u-range", "2026-05-01", "2026-05-03");
    expect(nights.map((n) => n.requestedDay)).toEqual(["2026-05-03"]);
    expect(nights[0]?.resolution).toBe("exact_anchor");
    expect(calledCollections).toEqual(["sleepNights"]);
    expect(sleepDocGet).not.toHaveBeenCalled();
    expect(rangeGet).toHaveBeenCalledTimes(1);
    expect(whereCalls).toEqual([
      { field: documentIdPath, op: ">=", value: "2026-04-29" },
      { field: documentIdPath, op: "<=", value: "2026-05-03" },
    ]);
  });

  it("keeps exact_anchor and wake_day, omits latest_completed_prior_night densification", async () => {
    // Night anchored 05-01 woke on 05-02. 05-03 would only densify via prior-night fallback → omit.
    const docs: Record<string, SleepNightDocumentDto> = {
      "2026-05-01": nightDoc({
        anchorDay: "2026-05-01",
        wakeDay: "2026-05-02",
        endedAt: "2026-05-02T07:00:00.000Z",
        score: 77,
      }),
    };
    mockSleepNightsOnly(docs);

    const nights = await loadSleepNightViewsForRange("u-range", "2026-05-01", "2026-05-03");
    expect(nights.map((n) => ({ day: n.requestedDay, resolution: n.resolution }))).toEqual([
      { day: "2026-05-01", resolution: "exact_anchor" },
      { day: "2026-05-02", resolution: "wake_day" },
    ]);
    expect(nights.map((n) => n.resolution)).not.toContain("latest_completed_prior_night");
  });

  it("returns empty array when start > end without Firestore I/O", async () => {
    const nights = await loadSleepNightViewsForRange("u-range", "2026-05-10", "2026-05-01");
    expect(nights).toEqual([]);
    expect(userCollection).not.toHaveBeenCalled();
  });
});
