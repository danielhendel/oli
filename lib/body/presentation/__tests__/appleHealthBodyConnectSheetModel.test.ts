import {
  BODY_APPLE_HEALTH_CONNECT_METRICS,
  buildAppleHealthBodyConnectSheetCopy,
  formatAppleHealthLastUpdatedLabel,
  mapConnectPhaseToCardAction,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { BODY_COMPOSITION_CONNECT_READ_PERMISSIONS } from "@/lib/integrations/appleHealth";
import { UI_APPLE_HEALTH_HEART } from "@/lib/ui/theme/uiTokens";
import { BODY_APPLE_HEALTH_ICON_COLOR } from "@/lib/ui/body/BodyAppleHealthSourceIcon";

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

  it("healthy connected omits Sync latest, Review access, and Manage Apple Health", () => {
    for (const phase of ["connectedStatus", "upToDate", "connectedNoData"] as const) {
      const copy = buildAppleHealthBodyConnectSheetCopy(phase);
      expect(copy.primaryLabel).toBe("Done");
      expect(copy.showReviewAccess).toBe(false);
      expect(copy.showResumeImport).toBe(false);
      expect(copy.allowPullToRefresh).toBe(true);
      expect(copy.showStatusRows).toBe(true);
      expect(JSON.stringify(copy)).not.toMatch(/Sync latest|Manage Apple Health|Review access/i);
    }
  });

  it("keeps Connected on historyIncomplete with Resume history only", () => {
    expect(mapConnectPhaseToCardAction("historyIncomplete", "ready")).toEqual({
      kind: "connected_attention",
      label: "Connected",
    });
    const copy = buildAppleHealthBodyConnectSheetCopy("historyIncomplete");
    expect(copy.statusChip).toBe("Connected");
    expect(copy.primaryLabel).toBe("Resume history");
    expect(copy.showReviewAccess).toBe(false);
    expect(copy.body).toMatch(/latest measurements are available/i);
  });

  it("shows Review access only for needsReview", () => {
    const copy = buildAppleHealthBodyConnectSheetCopy("needsReview");
    expect(copy.primaryLabel).toBe("Review access");
    expect(copy.statusChip).toBe("Needs attention");
  });

  it("formats last updated factually", () => {
    expect(formatAppleHealthLastUpdatedLabel(null)).toBe("Not yet");
    const now = Date.parse("2026-09-19T18:00:00.000Z");
    expect(formatAppleHealthLastUpdatedLabel("2026-09-19T17:59:30.000Z", now)).toBe("Just now");
    expect(formatAppleHealthLastUpdatedLabel("not-a-date", now)).toBe("Not yet");
  });

  it("uses Apple Health red semantic token for the heart", () => {
    expect(BODY_APPLE_HEALTH_ICON_COLOR).toBe(UI_APPLE_HEALTH_HEART);
    expect(BODY_APPLE_HEALTH_ICON_COLOR.toLowerCase()).not.toBe("#5b6cff");
    expect(BODY_APPLE_HEALTH_ICON_COLOR.toLowerCase()).not.toMatch(/007aff|5b8def|indigo/i);
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
