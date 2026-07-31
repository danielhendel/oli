import { describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_ARTIFACT_IDS,
  DOCUMENT_ARTIFACT_OWNERSHIP,
  DOCUMENT_STORAGE_SECURITY_MODEL,
  DOCUMENT_UPLOAD_TRANSPORT_MODE,
  listDocumentArtifactOwnership,
} from "../documentStorageSecurityModel";
import { DOCUMENT_STORAGE_RULES_SOURCE } from "../documentStorageRulesSource";
import { DOCUMENT_UPLOAD_ENABLED_DOMAINS, DOCUMENT_UPLOAD_DEFERRED_DOMAINS } from "../documentTypes";

describe("documentStorageSecurityModel", () => {
  it("declares server-only Admin SDK storage model", () => {
    expect(DOCUMENT_STORAGE_SECURITY_MODEL).toBe("server_only_admin_sdk");
    expect(DOCUMENT_UPLOAD_TRANSPORT_MODE).toBe("base64_json_bridge_v1");
  });

  it("covers every document artifact with user-scoped ownership", () => {
    const ownership = listDocumentArtifactOwnership();
    expect(ownership).toHaveLength(DOCUMENT_ARTIFACT_IDS.length);
    for (const artifact of ownership) {
      expect(artifact.userScoped).toBe(true);
      expect(artifact.createdBy).toBe("cloud_run_api");
      expect(artifact.readBy).toBe("cloud_run_api");
      expect(artifact.updatedBy).toBe("cloud_run_api");
      expect(artifact.deletedBy).toContain("cloud_run_api");
      expect(artifact.deletedBy).toContain("account_delete_executor");
      expect(artifact.parentRelationship.length).toBeGreaterThan(0);
    }
  });

  it("requires export and delete for durable artifacts", () => {
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.document_metadata.exportRequired).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.original_file.exportRequired).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.ingestion_job.exportRequired).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.extraction_result.exportRequired).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.legacy_labs_mirror.exportRequired).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.upload_intent.exportRequired).toBe(false);

    for (const artifact of listDocumentArtifactOwnership()) {
      expect(artifact.deleteRequired).toBe(true);
    }
  });

  it("keeps content identity immutable for originals and metadata", () => {
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.document_metadata.immutableContentIdentity).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.original_file.immutableContentIdentity).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.legacy_labs_mirror.immutableContentIdentity).toBe(true);
    expect(DOCUMENT_ARTIFACT_OWNERSHIP.ingestion_job.immutableContentIdentity).toBe(false);
  });

  it("deny-all storage rules source matches Model A", () => {
    expect(DOCUMENT_STORAGE_RULES_SOURCE).toContain("allow read, write: if false");
    expect(DOCUMENT_STORAGE_RULES_SOURCE).toContain("firebase.storage");
  });

  it("enables only labs uploads under the base64 bridge", () => {
    expect([...DOCUMENT_UPLOAD_ENABLED_DOMAINS]).toEqual(["labs"]);
    expect(DOCUMENT_UPLOAD_DEFERRED_DOMAINS).toEqual(
      expect.arrayContaining(["scans", "medical_history", "dna", "medications", "supplements"]),
    );
  });
});
