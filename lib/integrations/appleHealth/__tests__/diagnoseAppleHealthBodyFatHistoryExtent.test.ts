import { diagnoseAppleHealthBodyFatHistoryExtent } from "@/lib/integrations/appleHealth/diagnoseAppleHealthBodyFatHistoryExtent";

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
    mockPull.mockResolvedValue({
      ok: true,
      data: [
        {
          observedAt: "2023-06-15T10:00:00.000Z",
          bodyFatPercent: 17.5,
        } as never,
      ],
    });
  });

  it("emits privacy-safe extent metadata without Body Fat values", async () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const diag = await diagnoseAppleHealthBodyFatHistoryExtent({
      nowIso: "2026-01-15T00:00:00.000Z",
      years: 1,
      chunkDays: 200,
    });
    expect(diag.metric).toBe("bodyFat");
    expect(diag.status).toBe("ok");
    expect(diag.oldestObservedAt).toBe("2023-06-15T10:00:00.000Z");
    expect(diag.sampleCountBucket).toMatch(/^[0-9+-]+$/);
    expect(JSON.stringify(diag)).not.toMatch(/17\.5|bodyFatPercent|uid|email|token/i);
    expect(spy).toHaveBeenCalledWith(
      "[AH_BODY_FAT_HISTORY_EXTENT]",
      expect.objectContaining({ metric: "bodyFat" }),
    );
    spy.mockRestore();
  });
});
