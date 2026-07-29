/**
 * Collect original document/lab bytes into a user-owned export package layout.
 * Injectable Storage reads — no Firebase imports (testable).
 *
 * Package layout:
 *   documents/<domain>/<safe-filename>
 *   metadata.json
 */
import {
  buildSafeDocumentExportRecord,
  buildSafeLabUploadExportRecord,
  documentStorageObjectIdFromRecord,
  labUploadStoragePathFromRecord,
  type SafeDocumentExportRecord,
} from "../../../../lib/data/documents/documentAccountLifecycle";
import { buildZipStoreArchive, sha256Hex, type ZipStoreEntry } from "./buildZipStoreArchive";

export type SafeLabUploadExportRecord = NonNullable<ReturnType<typeof buildSafeLabUploadExportRecord>>;

export type DocumentExportPackageResult = {
  zipBytes: Buffer;
  metadata: Record<string, unknown>;
  documents: SafeDocumentExportRecord[];
  labUploads: SafeLabUploadExportRecord[];
  incomplete: string[];
  /** True only when every required original was packaged and checksum-verified. */
  complete: boolean;
};

function sanitizeFilename(filename: string): string {
  const trimmed = filename.replace(/[/\\]/g, "_").replace(/[^\w.\- ()[\]]+/g, "_").trim();
  const sliced = trimmed.slice(0, 160);
  return sliced.length > 0 ? sliced : "document.pdf";
}

function uniquePackagePath(
  used: Set<string>,
  domain: string,
  id: string,
  filename: string,
): string {
  const safe = sanitizeFilename(filename);
  const baseDir = `documents/${domain}`;
  let candidate = `${baseDir}/${safe}`;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  const shortId = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "id";
  candidate = `${baseDir}/${shortId}_${safe}`;
  used.add(candidate);
  return candidate;
}

function assertObjectOwnedByUser(uid: string, objectPath: string): boolean {
  return (
    objectPath.startsWith(`users/${uid}/documents/`) ||
    objectPath.startsWith(`lab-uploads/${uid}/`)
  );
}

export async function buildDocumentExportPackage(args: {
  uid: string;
  generatedAt: string;
  requestId: string;
  documents: Record<string, unknown>[];
  labUploads: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  extractions: Record<string, unknown>[];
  otherCollections?: Record<string, unknown>;
  profile?: unknown;
  readObjectBytes: (objectPath: string) => Promise<Buffer | null>;
}): Promise<DocumentExportPackageResult> {
  const incomplete: string[] = [];
  const usedPaths = new Set<string>();
  const fileEntries: ZipStoreEntry[] = [];
  const documents: SafeDocumentExportRecord[] = [];
  const labUploads: SafeLabUploadExportRecord[] = [];

  for (const raw of args.documents) {
    const base = buildSafeDocumentExportRecord(raw);
    if (!base) {
      incomplete.push("document_metadata_invalid");
      continue;
    }

    const objectPath = documentStorageObjectIdFromRecord(raw);
    if (!objectPath || !assertObjectOwnedByUser(args.uid, objectPath)) {
      incomplete.push(
        !objectPath
          ? `document_original_missing:${base.id}`
          : `document_original_cross_user_blocked:${base.id}`,
      );
      documents.push({
        ...base,
        originalFile: { packageRelativePath: "", includedInPackage: false },
      });
      continue;
    }

    const bytes = await args.readObjectBytes(objectPath);
    if (!bytes) {
      incomplete.push(`document_original_missing:${base.id}`);
      documents.push({
        ...base,
        originalFile: { packageRelativePath: "", includedInPackage: false },
      });
      continue;
    }

    const digest = sha256Hex(bytes);
    if (digest !== base.checksumSha256) {
      incomplete.push(`document_checksum_mismatch:${base.id}`);
      documents.push({
        ...base,
        originalFile: { packageRelativePath: "", includedInPackage: false },
      });
      continue;
    }

    const packageRelativePath = uniquePackagePath(usedPaths, base.domain, base.id, base.filename);
    fileEntries.push({ path: packageRelativePath, data: bytes });
    documents.push({
      ...base,
      originalFile: { packageRelativePath, includedInPackage: true },
    });
  }

  for (const raw of args.labUploads) {
    const base = buildSafeLabUploadExportRecord(raw);
    if (!base) {
      incomplete.push("lab_upload_metadata_invalid");
      continue;
    }
    const objectPath = labUploadStoragePathFromRecord(raw);
    if (!objectPath || !assertObjectOwnedByUser(args.uid, objectPath)) {
      incomplete.push(
        !objectPath ? `lab_original_missing:${base.id}` : `lab_original_cross_user_blocked:${base.id}`,
      );
      labUploads.push({
        ...base,
        originalFile: { packageRelativePath: "", includedInPackage: false },
      });
      continue;
    }

    const bytes = await args.readObjectBytes(objectPath);
    if (!bytes) {
      incomplete.push(`lab_original_missing:${base.id}`);
      labUploads.push({
        ...base,
        originalFile: { packageRelativePath: "", includedInPackage: false },
      });
      continue;
    }

    const packageRelativePath = uniquePackagePath(usedPaths, "labs", base.id, base.filename);
    fileEntries.push({ path: packageRelativePath, data: bytes });
    labUploads.push({
      ...base,
      packagedChecksumSha256: sha256Hex(bytes),
      originalFile: { packageRelativePath, includedInPackage: true },
    });
  }

  const complete = incomplete.length === 0;

  // Consumer package: no raw UID, no bucket, no internal Storage paths.
  const metadata: Record<string, unknown> = {
    schemaVersion: 1,
    kind: "account.export.package.v1",
    generatedAt: args.generatedAt,
    completeness: complete ? "complete" : "partial",
    incomplete: [...incomplete],
    profile: args.profile ?? null,
    documents,
    labUploads,
    documentIngestionJobs: args.jobs,
    documentExtractions: args.extractions,
    collections: args.otherCollections ?? {},
    note:
      "Original uploaded files are included under documents/<domain>/ when completeness is complete. This package omits internal Storage paths, bucket names, service credentials, and account identifiers.",
  };

  const zipEntries: ZipStoreEntry[] = [
    { path: "metadata.json", data: Buffer.from(JSON.stringify(metadata, null, 2), "utf8") },
    ...fileEntries,
  ];

  return {
    zipBytes: buildZipStoreArchive(zipEntries),
    metadata,
    documents,
    labUploads,
    incomplete,
    complete,
  };
}
