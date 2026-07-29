import { describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS,
  buildSafeDocumentExportRecord,
  buildSafeLabUploadExportRecord,
  documentAccountStoragePrefixes,
  documentStorageObjectIdFromRecord,
  labUploadStoragePathFromRecord,
} from "../documentAccountLifecycle";
import { assembleDocumentExportSection } from "../../../../services/functions/src/account/assembleDocumentExportSection";
import {
  deleteStoragePrefix,
  planDocumentAccountDelete,
} from "../../../../services/functions/src/account/documentAccountDelete";

const SYNTHETIC_UID = "uid_fixture_phase3c_lifecycle";
const SYNTHETIC_DOC_ID = "doc_synthetic_pdf_001";
const SYNTHETIC_CHECKSUM = "c".repeat(64);

function syntheticDocumentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SYNTHETIC_DOC_ID,
    userId: SYNTHETIC_UID,
    domain: "labs",
    documentType: "lab_report",
    originalFilename: "synthetic-lab-fixture.pdf",
    safeDisplayFilename: "synthetic-lab-fixture.pdf",
    status: "unsupported",
    uploadedAt: "2026-07-28T12:00:00.000Z",
    source: "user_upload",
    schemaVersion: "1.0.0",
    byteSize: 2048,
    checksumSha256: SYNTHETIC_CHECKSUM,
    storageObjectId: `users/${SYNTHETIC_UID}/documents/${SYNTHETIC_DOC_ID}/original`,
    parser: { id: "noop_unsupported_v1", version: "1.0.0" },
    legacyLabUploadId: null,
    ...overrides,
  };
}

describe("documentAccountLifecycle export records", () => {
  it("builds safe document export metadata with original-file relationship", () => {
    const safe = buildSafeDocumentExportRecord(syntheticDocumentRow());
    expect(safe).not.toBeNull();
    expect(safe!.filename).toBe("synthetic-lab-fixture.pdf");
    expect(safe!.domain).toBe("labs");
    expect(safe!.documentType).toBe("lab_report");
    expect(safe!.parserId).toBe("noop_unsupported_v1");
    expect(safe!.parserVersion).toBe("1.0.0");
    expect(safe!.originalFile.packageRelativePath).toBe(
      `files/documents/${SYNTHETIC_DOC_ID}/synthetic-lab-fixture.pdf`,
    );
    expect(safe!.originalFile.includedInPackage).toBe(false);
    expect(JSON.stringify(safe)).not.toContain(SYNTHETIC_UID);
    expect(JSON.stringify(safe)).not.toContain("storageObjectId");
    expect(JSON.stringify(safe)).not.toContain("users/");
  });

  it("omits operational storage paths from consumer-safe records", () => {
    const raw = syntheticDocumentRow();
    expect(documentStorageObjectIdFromRecord(raw)).toContain(`users/${SYNTHETIC_UID}/`);
    const safe = buildSafeDocumentExportRecord(raw)!;
    expect(JSON.stringify(safe)).not.toContain(documentStorageObjectIdFromRecord(raw)!);
  });

  it("builds safe legacy Labs upload export with relationship", () => {
    const safe = buildSafeLabUploadExportRecord({
      id: "lab_legacy_1",
      fileName: "synthetic-legacy.pdf",
      status: "unsupported",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      storagePath: `lab-uploads/${SYNTHETIC_UID}/abc/synthetic-legacy.pdf`,
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    expect(safe).not.toBeNull();
    expect(safe!.originalFile.packageRelativePath).toBe(
      "files/labUploads/lab_legacy_1/synthetic-legacy.pdf",
    );
    expect(JSON.stringify(safe)).not.toContain("lab-uploads/");
    expect(labUploadStoragePathFromRecord({ storagePath: `lab-uploads/${SYNTHETIC_UID}/x.pdf` })).toContain(
      "lab-uploads/",
    );
  });

  it("assembles deterministic export section without credentials", () => {
    const section = assembleDocumentExportSection({
      documents: [syntheticDocumentRow()],
      jobs: [
        {
          id: "job_1",
          documentId: SYNTHETIC_DOC_ID,
          state: "completed",
          domain: "labs",
          documentType: "lab_report",
          parserId: "noop_unsupported_v1",
          parserVersion: "1.0.0",
          extractionVersion: null,
          dryRun: false,
          reprocessOfJobId: null,
          createdAt: "2026-07-28T12:00:01.000Z",
          updatedAt: "2026-07-28T12:00:02.000Z",
          stateHistory: [],
        },
      ],
      extractions: [
        {
          id: "ext_1",
          documentId: SYNTHETIC_DOC_ID,
          parserId: "noop_unsupported_v1",
          parserVersion: "1.0.0",
          extractionVersion: "1.0.0",
          status: "unsupported",
          reviewStatus: "not_required",
          schemaVersion: "1.0.0",
          createdAt: "2026-07-28T12:00:02.000Z",
          fields: [{ name: "ignored_staging_field", value: 1 }],
        },
      ],
      labUploads: [
        {
          id: "lab_legacy_1",
          fileName: "synthetic-legacy.pdf",
          status: "unsupported",
          uploadedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
    });

    expect(section.incomplete).toEqual([]);
    expect(section.documents).toHaveLength(1);
    expect(section.labUploads).toHaveLength(1);
    expect(section.jobs[0]).toMatchObject({ id: "job_1", documentId: SYNTHETIC_DOC_ID });
    expect(section.extractions[0]).toMatchObject({
      id: "ext_1",
      fieldCount: 1,
      fieldsExportedAsStagingOnly: true,
    });
    expect(section.extractions[0]).not.toHaveProperty("fields");
    const serialized = JSON.stringify(section);
    expect(serialized).not.toContain("serviceAccount");
    expect(serialized).not.toContain("private_key");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain(SYNTHETIC_UID);
  });
});

describe("documentAccountDelete plan and storage prefix delete", () => {
  it("plans user-scoped firestore collections and storage prefixes", () => {
    expect([...DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS]).toEqual([
      "documents",
      "documentIngestionJobs",
      "documentExtractions",
      "labUploads",
      "labResults",
    ]);
    expect(documentAccountStoragePrefixes(SYNTHETIC_UID)).toEqual([
      `users/${SYNTHETIC_UID}/documents/`,
      `lab-uploads/${SYNTHETIC_UID}/`,
    ]);
    const plan = planDocumentAccountDelete(SYNTHETIC_UID);
    expect(plan.firestoreCollections).toEqual([...DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS]);
    expect(plan.storagePrefixes).toEqual([...documentAccountStoragePrefixes(SYNTHETIC_UID)]);
  });

  it("deletes storage objects under a prefix and is idempotent when empty", async () => {
    const objects = new Set([
      `users/${SYNTHETIC_UID}/documents/${SYNTHETIC_DOC_ID}/original`,
      `users/${SYNTHETIC_UID}/documents/${SYNTHETIC_DOC_ID}/sidecar`,
    ]);
    const first = await deleteStoragePrefix({
      prefix: `users/${SYNTHETIC_UID}/documents/`,
      listFiles: async (prefix) => [...objects].filter((p) => p.startsWith(prefix)),
      deleteFile: async (objectPath) => {
        objects.delete(objectPath);
      },
    });
    expect(first.deletedCount).toBe(2);
    expect(first.errors).toEqual([]);
    expect(objects.size).toBe(0);

    const second = await deleteStoragePrefix({
      prefix: `users/${SYNTHETIC_UID}/documents/`,
      listFiles: async (prefix) => [...objects].filter((p) => p.startsWith(prefix)),
      deleteFile: async (objectPath) => {
        objects.delete(objectPath);
      },
    });
    expect(second.deletedCount).toBe(0);
    expect(second.errors).toEqual([]);
  });

  it("reports partial failure without claiming success", async () => {
    const result = await deleteStoragePrefix({
      prefix: `users/${SYNTHETIC_UID}/documents/`,
      listFiles: async () => [`users/${SYNTHETIC_UID}/documents/${SYNTHETIC_DOC_ID}/original`],
      deleteFile: async () => {
        throw new Error("permission denied");
      },
    });
    expect(result.deletedCount).toBe(0);
    expect(result.errors).toEqual(["permission denied"]);
  });

  it("treats not-found delete errors as success for retries", async () => {
    const result = await deleteStoragePrefix({
      prefix: `lab-uploads/${SYNTHETIC_UID}/`,
      listFiles: async () => [`lab-uploads/${SYNTHETIC_UID}/abc/file.pdf`],
      deleteFile: async () => {
        throw new Error("No such object: lab-uploads/…");
      },
    });
    expect(result.deletedCount).toBe(1);
    expect(result.errors).toEqual([]);
  });
});
