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
    expect(USER_DATA_RETENTION_REGISTRY.user_documents.currentExportCoverage).toBe("not_covered");
    expect(USER_DATA_RETENTION_REGISTRY.user_documents.currentDeleteCoverage).toBe("partial");
    expect(USER_DATA_RETENTION_REGISTRY.storage_document_originals.currentDeleteCoverage).toBe("partial");
    expect(listExportCoverageGaps().length).toBeGreaterThan(0);
    expect(listDeleteCoverageGaps().length).toBeGreaterThan(0);
    expect(isExportDeletionCoverageComplete()).toBe(false);
  });

  it("inventories Document Ingestion OS artifacts honestly", () => {
    expect(USER_DATA_RETENTION_REGISTRY.user_documents.path).toBe("users/{uid}/documents/{documentId}");
    expect(USER_DATA_RETENTION_REGISTRY.document_ingestion_jobs.path).toBe(
      "users/{uid}/documentIngestionJobs/{jobId}",
    );
    expect(USER_DATA_RETENTION_REGISTRY.document_extractions.path).toBe(
      "users/{uid}/documentExtractions/{extractionId}",
    );
    expect(USER_DATA_RETENTION_REGISTRY.storage_document_originals.path).toBe(
      "users/{uid}/documents/{documentId}/original",
    );
    expect(USER_DATA_RETENTION_REGISTRY.user_documents.dataCategory).toBe("documents");
    expect(USER_DATA_RETENTION_REGISTRY.user_documents.storageObjectRelationship).toBe(true);
  });

  it("represents lab upload metadata and the related Storage object relationship", () => {
    const metadata = USER_DATA_RETENTION_REGISTRY.lab_uploads;
    const storage = USER_DATA_RETENTION_REGISTRY.storage_lab_uploads;

    expect(metadata.path).toBe("users/{uid}/labUploads/{uploadId}");
    expect(metadata.dataCategory).toBe("labs");
    expect(metadata.storageObjectRelationship).toBe(true);
    expect(metadata.exportRequired).toBe(true);
    expect(metadata.deleteRequired).toBe(true);
    expect(metadata.currentExportCoverage).toBe("not_covered");
    expect(metadata.currentDeleteCoverage).toBe("not_covered");

    expect(storage.path).toBe("lab-uploads/{uid}/{fileHash}/{safeName}");
    expect(storage.dataCategory).toBe("storage");
    expect(storage.storageObjectRelationship).toBe(true);
    expect(storage.exportRequired).toBe(true);
    expect(storage.deleteRequired).toBe(true);
    expect(storage.currentExportCoverage).toBe("not_covered");
    expect(storage.currentDeleteCoverage).toBe("not_covered");
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
