/**
 * Phase 3C Document Ingestion OS — typed ownership + transport contracts.
 *
 * Storage model A: SERVER-ONLY Admin SDK access.
 * Client never reads/writes Firebase Storage for documents.
 * view-original does not issue signed URLs in this phase.
 */

export const DOCUMENT_STORAGE_SECURITY_MODEL = "server_only_admin_sdk" as const;

/**
 * Base64-in-JSON complete-upload is a bounded staging bridge (5 MiB).
 * Not a production streaming/signed-upload transport.
 * Labs PDF only until streaming/signed upload lands.
 */
export const DOCUMENT_UPLOAD_TRANSPORT_MODE = "base64_json_bridge_v1" as const;

export const DOCUMENT_ARTIFACT_IDS = [
  "document_metadata",
  "original_file",
  "upload_intent",
  "ingestion_job",
  "classification_result",
  "extraction_result",
  "reprocessing_history",
  "legacy_labs_mirror",
] as const;

export type DocumentArtifactId = (typeof DOCUMENT_ARTIFACT_IDS)[number];

export type DocumentArtifactOwnership = {
  artifactId: DocumentArtifactId;
  /** Application creator boundary (always authenticated API for user-owned docs). */
  createdBy: "cloud_run_api";
  readBy: "cloud_run_api";
  updatedBy: "cloud_run_api";
  deletedBy: readonly ("cloud_run_api" | "account_delete_executor")[];
  exportRequired: boolean;
  deleteRequired: boolean;
  parentRelationship: string;
  storageObjectRelationship: boolean;
  userScoped: true;
  immutableContentIdentity: boolean;
};

export const DOCUMENT_ARTIFACT_OWNERSHIP = {
  document_metadata: {
    artifactId: "document_metadata",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "users/{uid}/documents/{documentId}",
    storageObjectRelationship: true,
    userScoped: true,
    immutableContentIdentity: true,
  },
  original_file: {
    artifactId: "original_file",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "document_metadata.storageObjectId → users/{uid}/documents/{documentId}/original",
    storageObjectRelationship: true,
    userScoped: true,
    immutableContentIdentity: true,
  },
  upload_intent: {
    artifactId: "upload_intent",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: false,
    deleteRequired: true,
    parentRelationship: "same document_metadata row while status=uploading",
    storageObjectRelationship: false,
    userScoped: true,
    immutableContentIdentity: false,
  },
  ingestion_job: {
    artifactId: "ingestion_job",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "documentIngestionJobs.documentId → documents.id",
    storageObjectRelationship: false,
    userScoped: true,
    immutableContentIdentity: false,
  },
  classification_result: {
    artifactId: "classification_result",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "embedded in document type + job history",
    storageObjectRelationship: false,
    userScoped: true,
    immutableContentIdentity: false,
  },
  extraction_result: {
    artifactId: "extraction_result",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "documentExtractions.documentId → documents.id",
    storageObjectRelationship: false,
    userScoped: true,
    immutableContentIdentity: false,
  },
  reprocessing_history: {
    artifactId: "reprocessing_history",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "documentIngestionJobs.reprocessOfJobId chain",
    storageObjectRelationship: false,
    userScoped: true,
    immutableContentIdentity: false,
  },
  legacy_labs_mirror: {
    artifactId: "legacy_labs_mirror",
    createdBy: "cloud_run_api",
    readBy: "cloud_run_api",
    updatedBy: "cloud_run_api",
    deletedBy: ["cloud_run_api", "account_delete_executor"] as const,
    exportRequired: true,
    deleteRequired: true,
    parentRelationship: "documents.legacyLabUploadId → labUploads.id",
    storageObjectRelationship: true,
    userScoped: true,
    immutableContentIdentity: true,
  },
} as const satisfies Record<DocumentArtifactId, DocumentArtifactOwnership>;

export function listDocumentArtifactOwnership(): readonly DocumentArtifactOwnership[] {
  return DOCUMENT_ARTIFACT_IDS.map((id) => DOCUMENT_ARTIFACT_OWNERSHIP[id]);
}
