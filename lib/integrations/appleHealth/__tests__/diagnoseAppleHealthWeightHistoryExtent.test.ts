import { diagnoseAppleHealthWeightHistoryExtent } from "@/lib/integrations/appleHealth/diagnoseAppleHealthWeightHistoryExtent";

const mockPull = jest.fn();

jest.mock("@/lib/integrations/appleHealth/healthKit", () => ({
  pullBodyCompositionSamples: (...args: unknown[]) => mockPull(...args),
}));

describe("diagnoseAppleHealthWeightHistoryExtent", () => {
  beforeEach(() => {
    mockPull.mockReset();
  });

  it("scans forward through empty chunks to find older Weight and emits safe extent log", async () => {
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    mockPull.mockImplementation(async (opts: { startDate: string; endDate: string }) => {
      // Empty early chunk
      if (opts.startDate.startsWith("2021")) {
        return { ok: true, data: [] };
      }
      // Gap year
      if (opts.startDate.startsWith("2022") || opts.startDate.startsWith("2024")) {
        return { ok: true, data: [] };
      }
      if (opts.startDate.startsWith("2023")) {
        return {
          ok: true,
          data: [
            { observedAt: "2023-06-15T12:00:00.000Z", sourceId: "watch", weightKg: 80 },
            { observedAt: "2023-07-01T12:00:00.000Z", sourceId: "watch", weightKg: 81 },
          ],
        };
      }
      return {
        ok: true,
        data: [{ observedAt: "2026-09-21T12:00:00.000Z", sourceId: "watch", weightKg: 82 }],
      };
    });

    const diag = await diagnoseAppleHealthWeightHistoryExtent({
      nowIso: "2026-09-21T12:00:00.000Z",
      years: 5,
      chunkDays: 365,
    });

    expect(diag.status).toBe("ok");
    expect(diag.oldestObservedAt).toBe("2023-06-15T12:00:00.000Z");
    expect(diag.newestObservedAt).toBe("2026-09-21T12:00:00.000Z");
    expect(diag.pagesOrChunks).toBeGreaterThan(2);
    expect(JSON.stringify(diag)).not.toMatch(/"weightKg"|:80|:81|:82/);
    expect(info).toHaveBeenCalledWith(
      "[AH_WEIGHT_HISTORY_EXTENT]",
      expect.objectContaining({
        metric: "weight",
        oldestObservedAt: "2023-06-15T12:00:00.000Z",
        sampleCountBucket: expect.any(String),
      }),
    );
    info.mockRestore();
  });
});
