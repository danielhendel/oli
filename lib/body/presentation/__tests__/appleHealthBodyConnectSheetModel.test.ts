import {
  BODY_APPLE_HEALTH_CONNECT_METRICS,
  buildAppleHealthBodyConnectSheetCopy,
  mapConnectPhaseToCardAction,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { BODY_COMPOSITION_CONNECT_READ_PERMISSIONS } from "@/lib/integrations/appleHealth";

describe("Apple Health Body connect sheet model", () => {
  it("lists Weight, Body Fat, Lean Tissue and Connect & import history", () => {
    expect([...BODY_APPLE_HEALTH_CONNECT_METRICS]).toEqual(["Weight", "Body Fat", "Lean Tissue"]);
    const copy = buildAppleHealthBodyConnectSheetCopy("explaining");
    expect(copy.primaryLabel).toBe("Connect & import history");
    expect(copy.secondaryLabel).toBe("Not now");
    expect(copy.showMetricList).toBe(true);
    expect(copy.eyebrow).toBe("Apple Health");
    expect(copy.title).toBe("Body Composition");
    expect(JSON.stringify(copy)).not.toMatch(/Backfill|anchor|cursor|RawEvent/i);
  });

  it("keeps Connected on historyIncomplete — not Try again", () => {
    expect(mapConnectPhaseToCardAction("historyIncomplete", "ready")).toEqual({
      kind: "connected_attention",
      label: "Connected",
    });
    expect(mapConnectPhaseToCardAction("idle", "ready", true)).toEqual({
      kind: "connected_attention",
      label: "Connected",
    });
    const copy = buildAppleHealthBodyConnectSheetCopy("historyIncomplete");
    expect(copy.statusChip).toBe("Connected");
    expect(copy.primaryLabel).toBe("Resume import");
    expect(copy.body).toMatch(/latest measurements are still available/i);
  });

  it("maps disconnected Sync now and importing phases", () => {
    expect(mapConnectPhaseToCardAction("idle", "not_determined")).toEqual({
      kind: "sync_now",
      label: "Sync now",
    });
    expect(mapConnectPhaseToCardAction("importingEarlier", "not_determined").label).toBe(
      "Importing…",
    );
  });
});

describe("Body-only HealthKit permission scope", () => {
  it("requests only BodyMass, BodyFatPercentage, and LeanBodyMass", () => {
    expect([...BODY_COMPOSITION_CONNECT_READ_PERMISSIONS]).toEqual([
      "BodyMass",
      "BodyFatPercentage",
      "LeanBodyMass",
    ]);
  });
});
