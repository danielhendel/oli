jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import type { SleepNightDocumentDto } from "@oli/contracts/sleepNight";
import { loadSleepNightViewsForRange } from "../sleepNightRead";

const userCollection = jest.requireMock("../../db").userCollection as jest.Mock;

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

function snap(data: SleepNightDocumentDto | null) {
  if (!data) return { exists: false, data: () => undefined };
  return { exists: true, data: () => data };
}

describe("loadSleepNightViewsForRange", () => {
  beforeEach(() => {
    userCollection.mockReset();
  });

  it("omits unresolved days and does not query rawEvents", async () => {
    // Only the last day has a doc; earlier requested days have empty lookback (no prior-night fill).
    const docs: Record<string, SleepNightDocumentDto | null> = {
      "2026-04-29": null,
      "2026-04-30": null,
      "2026-05-01": null,
      "2026-05-02": null,
      "2026-05-03": nightDoc({
        anchorDay: "2026-05-03",
        wakeDay: "2026-05-03",
        score: 88,
      }),
    };

    const sleepDocGet = jest.fn(async (id: string) => snap(docs[id] ?? null));
    const calledCollections: string[] = [];

    userCollection.mockImplementation((_uid: string, name: string) => {
      calledCollections.push(name);
      if (name === "sleepNights") {
        return {
          doc: (id: string) => ({ get: () => sleepDocGet(id) }),
        };
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
    expect(sleepDocGet).toHaveBeenCalled();
  });

  it("returns empty array when start > end", async () => {
    const nights = await loadSleepNightViewsForRange("u-range", "2026-05-10", "2026-05-01");
    expect(nights).toEqual([]);
    expect(userCollection).not.toHaveBeenCalled();
  });
});
