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

describe("loadSleepNightViewsForRange", () => {
  beforeEach(() => {
    userCollection.mockReset();
  });

  it("omits unresolved days, uses one document-ID range query, and does not query rawEvents", async () => {
    // Only the last day has a doc; earlier requested days have empty lookback (no prior-night fill).
    const docs: Record<string, SleepNightDocumentDto> = {
      "2026-05-03": nightDoc({
        anchorDay: "2026-05-03",
        wakeDay: "2026-05-03",
        score: 88,
      }),
    };

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
      if (name === "ouraVendorSleep" || name === "ouraVendorReadiness" || name === "dailyFacts") {
        return {
          doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
          where: () => ({
            limit: () => ({ get: async () => ({ docs: [] }) }),
          }),
        };
      }
      if (name === "rawEvents") {
        throw new Error("rawEvents must not be queried for range reads");
      }
      return {};
    });

    const nights = await loadSleepNightViewsForRange("u-range", "2026-05-01", "2026-05-03");
    expect(nights.map((n) => n.requestedDay)).toEqual(["2026-05-03"]);
    expect(calledCollections).not.toContain("rawEvents");
    expect(sleepDocGet).not.toHaveBeenCalled();
    expect(rangeGet).toHaveBeenCalledTimes(1);
    expect(whereCalls).toEqual([
      { field: documentIdPath, op: ">=", value: "2026-04-29" },
      { field: documentIdPath, op: "<=", value: "2026-05-03" },
    ]);
  });

  it("returns empty array when start > end", async () => {
    const nights = await loadSleepNightViewsForRange("u-range", "2026-05-10", "2026-05-01");
    expect(nights).toEqual([]);
    expect(userCollection).not.toHaveBeenCalled();
  });
});
