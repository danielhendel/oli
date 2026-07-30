import { describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_DELETE_ACTION_LABEL,
  documentDeleteActionView,
  resolveDocumentDeleteCapability,
} from "../documentDeleteCapability";
import {
  consumerDocumentIdForLabUpload,
  documentMirrorsLabUpload,
  labResultBelongsToUpload,
  resolveDocumentDeleteIdentity,
  uniqueStorageObjectPaths,
} from "../documentDeleteRelationships";
import {
  DOCUMENT_PROCESSING_STALE_MS,
  reconcileDocumentProcessingStatus,
} from "../documentProcessingReconcile";

describe("documentDeleteCapability", () => {
  it("allows legacy lab and document_os deletes without exposing internals", () => {
    expect(
      resolveDocumentDeleteCapability({
        canDelete: true,
        legacySource: "lab_upload",
        status: "unsupported",
      }),
    ).toEqual({ canDelete: true, ownershipKind: "legacy_lab" });
    expect(
      resolveDocumentDeleteCapability({
        canDelete: true,
        legacySource: "document",
        status: "unsupported",
      }),
    ).toEqual({ canDelete: true, ownershipKind: "document_os" });
    const view = documentDeleteActionView({ canDelete: true, ownershipKind: "legacy_lab" });
    expect(view.actionLabel).toBe(DOCUMENT_DELETE_ACTION_LABEL);
    expect(JSON.stringify(view)).not.toContain("labUploads");
    expect(JSON.stringify(view)).not.toContain("storage");
  });

  it("blocks incomplete uploading records", () => {
    expect(
      resolveDocumentDeleteCapability({
        canDelete: true,
        legacySource: "document",
        status: "uploading",
      }),
    ).toEqual({ canDelete: false, reason: "record_incomplete" });
  });
});

describe("documentDeleteRelationships", () => {
  it("resolves lab: identity without using filename", () => {
    expect(resolveDocumentDeleteIdentity("lab:upload_abc")).toEqual({
      kind: "legacy_lab",
      consumerDocumentId: "lab:upload_abc",
      labUploadId: "upload_abc",
    });
    expect(resolveDocumentDeleteIdentity("doc_1")).toEqual({
      kind: "document_os",
      documentId: "doc_1",
      legacyLabUploadId: null,
    });
    expect(consumerDocumentIdForLabUpload("upload_abc")).toBe("lab:upload_abc");
  });

  it("gates labResults on explicit uploadId provenance", () => {
    expect(labResultBelongsToUpload({ resultUploadId: "u1", targetUploadId: "u1" })).toBe("match");
    expect(labResultBelongsToUpload({ resultUploadId: "u2", targetUploadId: "u1" })).toBe("mismatch");
    expect(labResultBelongsToUpload({ resultUploadId: null, targetUploadId: "u1" })).toBe("ambiguous");
    expect(documentMirrorsLabUpload({ legacyLabUploadId: "u1", targetUploadId: "u1" })).toBe(true);
    expect(documentMirrorsLabUpload({ legacyLabUploadId: "other", targetUploadId: "u1" })).toBe(false);
    expect(uniqueStorageObjectPaths(["a", "a", null, "b", ""])).toEqual(["a", "b"]);
  });
});

describe("reconcileDocumentProcessingStatus", () => {
  it("maps terminal unsupported job onto document status", () => {
    expect(
      reconcileDocumentProcessingStatus({
        documentStatus: "processing",
        jobState: "extraction_unsupported",
        jobUpdatedAt: "2026-07-30T00:00:00.000Z",
      }),
    ).toEqual({ status: "unsupported", reason: "job_terminal" });
  });

  it("fails closed when processing is stale", () => {
    const nowMs = Date.parse("2026-07-30T01:00:00.000Z");
    const old = new Date(nowMs - DOCUMENT_PROCESSING_STALE_MS - 1000).toISOString();
    expect(
      reconcileDocumentProcessingStatus({
        documentStatus: "processing",
        jobState: "extracting",
        jobUpdatedAt: old,
        nowMs,
      }),
    ).toEqual({ status: "failed", reason: "stale_timeout" });
  });

  it("leaves in-bound processing unchanged", () => {
    const nowMs = Date.parse("2026-07-30T00:05:00.000Z");
    expect(
      reconcileDocumentProcessingStatus({
        documentStatus: "processing",
        jobState: "extracting",
        jobUpdatedAt: "2026-07-30T00:00:00.000Z",
        nowMs,
      }),
    ).toEqual({ status: "processing", reason: "unchanged" });
  });
});
