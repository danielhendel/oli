import {
  diagnoseAppleHealthBodyFatHistoryExtent,
} from "@/lib/integrations/appleHealth/diagnoseAppleHealthBodyFatHistoryExtent";

jest.mock("@/lib/integrations/appleHealth/healthKit", () => ({
  pullBodyCompositionSamples: jest.fn(),
}));

import { pullBodyCompositionSamples } from "@/lib/integrations/appleHealth/healthKit";

const mockPull = pullBodyCompositionSamples as jest.MockedFunction<
  typeof pullBodyCompositionSamples
>;

describe("diagnoseAppleHealthBodyFatHistoryExtent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits privacy-safe extent metadata without Body Fat values", async () => {
    mockPull.mockImplementation(async (opts) => {
      if (opts.ascending && opts.limit === 1) {
        return {
          ok: true,
          data: [{ observedAt: "2017-06-10T10:00:00.000Z", bodyFatPercent: 17.5 } as never],
        };
      }
      return { ok: true, data: [] };
    });
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const diag = await diagnoseAppleHealthBodyFatHistoryExtent({
      nowIso: "2026-01-15T00:00:00.000Z",
    });
    expect(diag.metric).toBe("bodyFat");
    expect(diag.status).toBe("ok");
    expect(diag.oldestObservedAt).toBe("2017-06-10T10:00:00.000Z");
    expect(diag.sampleCountBucket).toMatch(/^[0-9+-]+$/);
    expect(JSON.stringify(diag)).not.toMatch(/17\.5|bodyFatPercent|uid|email|token/i);
    expect(spy).toHaveBeenCalledWith(
      "[AH_BODY_FAT_HISTORY_EXTENT]",
      expect.objectContaining({ metric: "bodyFat" }),
    );
    spy.mockRestore();
  });
});
