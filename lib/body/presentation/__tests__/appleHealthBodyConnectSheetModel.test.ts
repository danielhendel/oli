import {
  BODY_APPLE_HEALTH_CONNECT_METRICS,
  buildAppleHealthBodyConnectSheetCopy,
  formatAppleHealthLastUpdatedLabel,
  mapConnectPhaseToCardAction,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { BODY_COMPOSITION_CONNECT_READ_PERMISSIONS } from "@/lib/integrations/appleHealth";
import {
  BODY_APPLE_HEALTH_ICON_COLOR_MUTED,
  BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
} from "@/lib/ui/body/BodyAppleHealthSourceIcon";
import {
  UI_APPLE_HEALTH_HEART_MUTED,
  UI_APPLE_HEALTH_HEART_STRONG,
} from "@/lib/ui/theme/uiTokens";

describe("Apple Health Body connect sheet model", () => {
  it("lists Weight, Body Fat, Lean Mass and Connect & import history", () => {
    expect([...BODY_APPLE_HEALTH_CONNECT_METRICS]).toEqual(["Weight", "Body Fat", "Lean Mass"]);
    const copy = buildAppleHealthBodyConnectSheetCopy("explaining");
    expect(copy.primaryLabel).toBe("Connect & import history");
    expect(copy.secondaryLabel).toBe("Not now");
    expect(copy.showMetricList).toBe(true);
    expect(copy.eyebrow).toBe("Apple Health");
    expect(copy.title).toBe("Body Composition");
    expect(JSON.stringify(copy)).not.toMatch(/Backfill|anchor|cursor|RawEvent/i);
  });

  it("healthy connected omits explanatory copy and shows settings link + scope indicators", () => {
    for (const phase of ["connectedStatus", "upToDate"] as const) {
      const copy = buildAppleHealthBodyConnectSheetCopy(phase);
      expect(copy.primaryLabel).toBe("Done");
      expect(copy.body).toBeNull();
      expect(copy.showScopeIndicators).toBe(true);
      expect(copy.showSettingsLink).toBe(true);
      expect(copy.showReviewAccess).toBe(false);
      expect(JSON.stringify(copy)).not.toMatch(/Oli keeps these measurements/i);
      expect(JSON.stringify(copy)).not.toMatch(/Sync latest|Manage Apple Health|Review access/i);
    }
  });

  it("keeps Connected on historyIncomplete with Resume history", () => {
    expect(mapConnectPhaseToCardAction("historyIncomplete", "ready")).toEqual({
      kind: "connected_attention",
      label: "Connected",
    });
    const copy = buildAppleHealthBodyConnectSheetCopy("historyIncomplete");
    expect(copy.statusChip).toBe("Connected");
    expect(copy.primaryLabel).toBe("Resume history");
    expect(copy.showSettingsLink).toBe(true);
  });

  it("formats last updated factually", () => {
    expect(formatAppleHealthLastUpdatedLabel(null)).toBe("Not yet");
    const now = Date.parse("2026-09-19T18:00:00.000Z");
    expect(formatAppleHealthLastUpdatedLabel("2026-09-19T17:59:30.000Z", now)).toBe("Just now");
  });

  it("separates muted card heart from strong popup heart tokens", () => {
    expect(BODY_APPLE_HEALTH_ICON_COLOR_STRONG).toBe(UI_APPLE_HEALTH_HEART_STRONG);
    expect(BODY_APPLE_HEALTH_ICON_COLOR_MUTED).toBe(UI_APPLE_HEALTH_HEART_MUTED);
    expect(BODY_APPLE_HEALTH_ICON_COLOR_MUTED).not.toBe(BODY_APPLE_HEALTH_ICON_COLOR_STRONG);
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
