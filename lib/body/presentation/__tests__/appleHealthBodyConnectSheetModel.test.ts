import { BODY_COMPOSITION_CONNECT_READ_PERMISSIONS } from "@/lib/integrations/appleHealth";
import {
  BODY_APPLE_HEALTH_CONNECT_METRICS,
  buildAppleHealthBodyConnectSheetCopy,
  mapConnectPhaseToCardAction,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";

describe("Apple Health Body connect sheet model", () => {
  it("lists Weight, Body Fat, Lean Tissue and Connect & import history", () => {
    expect([...BODY_APPLE_HEALTH_CONNECT_METRICS]).toEqual(["Weight", "Body Fat", "Lean Tissue"]);
    const copy = buildAppleHealthBodyConnectSheetCopy("explaining");
    expect(copy.primaryLabel).toBe("Connect & import history");
    expect(copy.secondaryLabel).toBe("Not now");
    expect(copy.showMetricList).toBe(true);
    expect(copy.body).toMatch(/Body Composition/i);
    expect(JSON.stringify(copy)).not.toMatch(/Backfill/i);
  });

  it("uses phase-based progress copy without fabricated percentages", () => {
    expect(buildAppleHealthBodyConnectSheetCopy("findingLatest").progressLabel).toMatch(
      /latest measurements/i,
    );
    expect(buildAppleHealthBodyConnectSheetCopy("importingRecent").progressLabel).toMatch(
      /recent Body history/i,
    );
    expect(buildAppleHealthBodyConnectSheetCopy("importingEarlier").progressLabel).toMatch(
      /earlier Body history/i,
    );
    expect(buildAppleHealthBodyConnectSheetCopy("upToDate").body).toMatch(/up to date/i);
    expect(buildAppleHealthBodyConnectSheetCopy("connectedNoData").body).toMatch(
      /No Body measurements/i,
    );
    expect(buildAppleHealthBodyConnectSheetCopy("failed").primaryLabel).toBe("Try again");
  });

  it("maps card actions without claiming Connected for unknown access", () => {
    expect(mapConnectPhaseToCardAction("idle", "not_determined")).toEqual({
      kind: "sync_now",
      label: "Sync now",
    });
    expect(mapConnectPhaseToCardAction("importingEarlier", "not_determined").label).toBe(
      "Importing…",
    );
    expect(mapConnectPhaseToCardAction("idle", "ready").label).toBe("Connected");
  });
});

describe("Body-only HealthKit permission scope", () => {
  it("requests only BodyMass, BodyFatPercentage, and LeanBodyMass", () => {
    expect([...BODY_COMPOSITION_CONNECT_READ_PERMISSIONS]).toEqual([
      "BodyMass",
      "BodyFatPercentage",
      "LeanBodyMass",
    ]);
    expect(BODY_COMPOSITION_CONNECT_READ_PERMISSIONS).not.toContain("StepCount");
    expect(BODY_COMPOSITION_CONNECT_READ_PERMISSIONS).not.toContain("Workout");
    expect(BODY_COMPOSITION_CONNECT_READ_PERMISSIONS).not.toContain("HeartRate");
    expect(BODY_COMPOSITION_CONNECT_READ_PERMISSIONS).not.toContain("ActiveEnergyBurned");
  });
});
