import { buildAppleHealthAccessSummaryModel } from "@/lib/integrations/appleHealth/appleHealthAccessSummaryModel";
import { listImplementedAppleHealthDomains } from "@/lib/integrations/appleHealth/appleHealthDomainRegistry";

describe("Apple Health access summary model", () => {
  it("lists only implemented domains with consumer metrics", () => {
    const model = buildAppleHealthAccessSummaryModel({
      connected: true,
      lastSuccessfulSyncAtIso: "2026-09-19T18:00:00.000Z",
      enabledDomainCount: 4,
      nowMs: Date.parse("2026-09-19T18:00:30.000Z"),
    });
    expect(model.dataSections.map((s) => s.title)).toEqual(
      listImplementedAppleHealthDomains().map((d) => d.displayName),
    );
    expect(model.dataSections.find((s) => s.title === "Body Composition")?.metricsLine).toBe(
      "Weight, Body Fat, Lean Tissue",
    );
    expect(JSON.stringify(model)).not.toMatch(/Backfill|RawEvent|Anchor|Repair/i);
    expect(model.showConnectAll).toBe(false);
    expect(model.lastUpdatedLabel).toBe("Just now");
  });

  it("shows Connect all when disconnected", () => {
    const model = buildAppleHealthAccessSummaryModel({
      connected: false,
      lastSuccessfulSyncAtIso: null,
      enabledDomainCount: 0,
    });
    expect(model.showConnectAll).toBe(true);
    expect(model.connectedCategoriesLabel).toBe("None yet");
    expect(model.lastUpdatedLabel).toBe("Not yet");
  });
});
