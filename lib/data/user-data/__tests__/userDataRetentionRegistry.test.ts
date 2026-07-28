import { describe, expect, it } from "@jest/globals";
import {
  USER_DATA_RETENTION_PATH_IDS,
  USER_DATA_RETENTION_REGISTRY,
  isExportDeletionCoverageComplete,
  listDeleteCoverageGaps,
  listExportCoverageGaps,
  listUserDataRetentionEntries,
} from "../userDataRetentionRegistry";

describe("userDataRetentionRegistry", () => {
  it("is exhaustive over path ids with no duplicates", () => {
    expect(new Set(USER_DATA_RETENTION_PATH_IDS).size).toBe(USER_DATA_RETENTION_PATH_IDS.length);
    expect(listUserDataRetentionEntries()).toHaveLength(USER_DATA_RETENTION_PATH_IDS.length);
    for (const id of USER_DATA_RETENTION_PATH_IDS) {
      expect(USER_DATA_RETENTION_REGISTRY[id].pathId).toBe(id);
      expect(USER_DATA_RETENTION_REGISTRY[id].path.length).toBeGreaterThan(0);
    }
  });

  it("keeps export and delete coverage states explicit", () => {
    for (const entry of listUserDataRetentionEntries()) {
      expect(["covered", "partial", "not_covered", "n_a"]).toContain(entry.currentExportCoverage);
      expect(["covered", "partial", "not_covered", "n_a"]).toContain(entry.currentDeleteCoverage);
      expect(typeof entry.exportRequired).toBe("boolean");
      expect(typeof entry.deleteRequired).toBe("boolean");
      expect(typeof entry.storageObjectRelationship).toBe("boolean");
    }
  });

  it("includes Withings historical raw events in inventory", () => {
    const withings = USER_DATA_RETENTION_REGISTRY.withings_historical_raw_events;
    expect(withings.exportRequired).toBe(true);
    expect(withings.deleteRequired).toBe(true);
    expect(withings.currentExportCoverage).toBe("covered");
    expect(withings.currentDeleteCoverage).toBe("covered");
  });

  it("surfaces known labs and storage gaps", () => {
    expect(USER_DATA_RETENTION_REGISTRY.lab_uploads.currentExportCoverage).toBe("not_covered");
    expect(USER_DATA_RETENTION_REGISTRY.lab_uploads.currentDeleteCoverage).toBe("not_covered");
    expect(USER_DATA_RETENTION_REGISTRY.storage_lab_uploads.currentDeleteCoverage).toBe("not_covered");
    expect(listExportCoverageGaps().length).toBeGreaterThan(0);
    expect(listDeleteCoverageGaps().length).toBeGreaterThan(0);
    expect(isExportDeletionCoverageComplete()).toBe(false);
  });

  it("marks placeholder domains as n/a rather than silently omitted", () => {
    for (const id of [
      "medications_placeholder",
      "supplements_placeholder",
      "medical_history_placeholder",
      "scans_placeholder",
      "dna_placeholder",
    ] as const) {
      expect(USER_DATA_RETENTION_REGISTRY[id].dataCategory).toBe("placeholder");
      expect(USER_DATA_RETENTION_REGISTRY[id].currentExportCoverage).toBe("n_a");
      expect(USER_DATA_RETENTION_REGISTRY[id].currentDeleteCoverage).toBe("n_a");
    }
  });
});
