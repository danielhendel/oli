import { describe, expect, it } from "@jest/globals";
import {
  USER_DATA_SOURCE_IDS,
  USER_DATA_SOURCE_REGISTRY,
  getUserDataSource,
  listUserDataSources,
} from "../userDataSourceRegistry";

describe("userDataSourceRegistry", () => {
  it("includes every required source id exactly once", () => {
    expect(USER_DATA_SOURCE_IDS).toEqual([
      "firebase_auth",
      "profile_general",
      "profile_main",
      "preferences",
      "apple_health",
      "oura",
      "withings",
      "manual_strength",
      "manual_cardio",
      "manual_nutrition",
      "manual_body",
      "labs_upload",
      "scans_upload",
      "dna_upload",
      "medical_history",
      "medications",
      "supplements",
      "daily_facts",
      "raw_events",
      "workout_journal",
      "workout_summaries",
    ]);
    expect(new Set(USER_DATA_SOURCE_IDS).size).toBe(USER_DATA_SOURCE_IDS.length);
  });

  it("registry keys match source ids exhaustively", () => {
    for (const id of USER_DATA_SOURCE_IDS) {
      expect(USER_DATA_SOURCE_REGISTRY[id].sourceId).toBe(id);
      expect(getUserDataSource(id).sourceId).toBe(id);
    }
    expect(listUserDataSources()).toHaveLength(USER_DATA_SOURCE_IDS.length);
  });

  it("marks Withings as legacy orphaned and not current product truth", () => {
    const withings = getUserDataSource("withings");
    expect(withings.supportStatus).toBe("legacy_orphaned");
    expect(withings.legacyOrphaned).toBe(true);
    expect(withings.currentProductTruth).toBe(false);
    expect(withings.syncCapable).toBe(false);
    expect(withings.exportCapable).toBe(true);
    expect(withings.deletionCapable).toBe(true);
  });

  it("marks placeholder sources and does not treat them as implemented product truth", () => {
    for (const id of ["scans_upload", "dna_upload", "medical_history", "medications", "supplements"] as const) {
      const src = getUserDataSource(id);
      expect(src.placeholder).toBe(true);
      expect(src.currentProductTruth).toBe(false);
      expect(src.supportStatus).toBe("placeholder");
    }
  });

  it("keeps export and deletion flags explicit on every source", () => {
    for (const src of listUserDataSources()) {
      expect(typeof src.exportCapable).toBe("boolean");
      expect(typeof src.deletionCapable).toBe("boolean");
      expect(src.providerAttribution === null || typeof src.providerAttribution === "string").toBe(true);
    }
  });

  it("does not mark labs upload as normalized-capable while parser is unsupported", () => {
    expect(getUserDataSource("labs_upload").normalizedCapable).toBe(false);
  });
});
