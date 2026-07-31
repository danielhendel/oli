import { createHash } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { buildDocumentExportPackage } from "../../../../services/functions/src/account/buildDocumentExportPackage";
import { buildZipStoreArchive, sha256Hex } from "../../../../services/functions/src/account/buildZipStoreArchive";

const UID = "uid_fixture_export_pkg";
const OTHER_UID = "uid_other_user";

function pdfBytes(tag: string): Buffer {
  return Buffer.from(`%PDF-1.4\n% synthetic ${tag}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`);
}

function checksum(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

describe("buildZipStoreArchive", () => {
  it("packs and preserves entry bytes", () => {
    const payload = Buffer.from("hello-export");
    const zip = buildZipStoreArchive([{ path: "a.txt", data: payload }]);
    expect(zip.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(zip.includes(payload)).toBe(true);
  });
});

describe("buildDocumentExportPackage", () => {
  it("includes original PDF bytes with matching checksum and safe path", async () => {
    const bytes = pdfBytes("labs-a");
    const digest = checksum(bytes);
    const objectPath = `users/${UID}/documents/doc1/original`;
    const store = new Map<string, Buffer>([[objectPath, bytes]]);

    const result = await buildDocumentExportPackage({
      uid: UID,
      generatedAt: "2026-07-29T16:00:00.000Z",
      requestId: "req_export_1",
      documents: [
        {
          id: "doc1",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "synthetic-lab.pdf",
          safeDisplayFilename: "synthetic-lab.pdf",
          status: "unsupported",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: bytes.length,
          checksumSha256: digest,
          storageObjectId: objectPath,
          source: "user_upload",
        },
      ],
      labUploads: [],
      jobs: [{ id: "job1", documentId: "doc1", state: "completed" }],
      extractions: [{ id: "ext1", documentId: "doc1", status: "unsupported", fields: [] }],
      readObjectBytes: async (p) => store.get(p) ?? null,
    });

    expect(result.complete).toBe(true);
    expect(result.incomplete).toEqual([]);
    expect(result.documents[0]!.originalFile.includedInPackage).toBe(true);
    expect(result.documents[0]!.originalFile.packageRelativePath).toBe(
      "documents/labs/synthetic-lab.pdf",
    );
    expect(result.documents[0]!.checksumSha256).toBe(digest);
    expect(result.zipBytes.includes(bytes)).toBe(true);
    expect(result.zipBytes.includes(Buffer.from("metadata.json"))).toBe(true);
    const metaStr = JSON.stringify(result.metadata);
    expect(metaStr).not.toContain(UID);
    expect(metaStr).not.toContain("storageObjectId");
    expect(metaStr).not.toContain(objectPath);
    expect(metaStr).not.toContain("serviceAccount");
    expect(result.metadata.completeness).toBe("complete");
  });

  it("packages legacy Labs originals under documents/labs", async () => {
    const bytes = pdfBytes("legacy");
    const objectPath = `lab-uploads/${UID}/abc/legacy.pdf`;
    const result = await buildDocumentExportPackage({
      uid: UID,
      generatedAt: "2026-07-29T16:00:00.000Z",
      requestId: "req_export_legacy",
      documents: [],
      labUploads: [
        {
          id: "lab1",
          fileName: "legacy.pdf",
          status: "unsupported",
          uploadedAt: "2026-07-01T00:00:00.000Z",
          storagePath: objectPath,
        },
      ],
      jobs: [],
      extractions: [],
      readObjectBytes: async (p) => (p === objectPath ? bytes : null),
    });
    expect(result.complete).toBe(true);
    expect(result.labUploads[0]!.originalFile.packageRelativePath).toBe("documents/labs/legacy.pdf");
    expect(result.labUploads[0]!.packagedChecksumSha256).toBe(sha256Hex(bytes));
    expect(result.zipBytes.includes(bytes)).toBe(true);
  });

  it("excludes cross-user storage objects and marks incomplete", async () => {
    const bytes = pdfBytes("other");
    const result = await buildDocumentExportPackage({
      uid: UID,
      generatedAt: "2026-07-29T16:00:00.000Z",
      requestId: "req_cross",
      documents: [
        {
          id: "doc_x",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "x.pdf",
          status: "stored",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: bytes.length,
          checksumSha256: checksum(bytes),
          storageObjectId: `users/${OTHER_UID}/documents/doc_x/original`,
        },
      ],
      labUploads: [],
      jobs: [],
      extractions: [],
      readObjectBytes: async () => bytes,
    });
    expect(result.complete).toBe(false);
    expect(result.incomplete.some((i) => i.includes("cross_user"))).toBe(true);
    expect(result.zipBytes.includes(bytes)).toBe(false);
  });

  it("fails closed when original object is missing", async () => {
    const bytes = pdfBytes("missing");
    const result = await buildDocumentExportPackage({
      uid: UID,
      generatedAt: "2026-07-29T16:00:00.000Z",
      requestId: "req_missing",
      documents: [
        {
          id: "doc_missing",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "gone.pdf",
          status: "stored",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: bytes.length,
          checksumSha256: checksum(bytes),
          storageObjectId: `users/${UID}/documents/doc_missing/original`,
        },
      ],
      labUploads: [],
      jobs: [],
      extractions: [],
      readObjectBytes: async () => null,
    });
    expect(result.complete).toBe(false);
    expect(result.incomplete).toEqual(expect.arrayContaining(["document_original_missing:doc_missing"]));
    expect(result.metadata.completeness).toBe("partial");
    expect(result.documents[0]!.originalFile.includedInPackage).toBe(false);
  });

  it("skips uploading and failed placeholders without marking incomplete", async () => {
    const bytes = pdfBytes("durable");
    const digest = checksum(bytes);
    const objectPath = `users/${UID}/documents/doc_ok/original`;
    const result = await buildDocumentExportPackage({
      uid: UID,
      generatedAt: "2026-07-29T16:00:00.000Z",
      requestId: "req_skip_placeholders",
      documents: [
        {
          id: "doc_intent",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "intent.pdf",
          status: "uploading",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: 1,
          // missing checksum on purpose
        },
        {
          id: "doc_failed",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "failed.pdf",
          status: "failed",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: 1,
          checksumSha256: "b".repeat(64),
        },
        {
          id: "doc_ok",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "ok.pdf",
          status: "unsupported",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: bytes.length,
          checksumSha256: digest,
          storageObjectId: objectPath,
        },
      ],
      labUploads: [],
      jobs: [],
      extractions: [],
      readObjectBytes: async (p) => (p === objectPath ? bytes : null),
    });
    expect(result.complete).toBe(true);
    expect(result.incomplete).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]!.id).toBe("doc_ok");
    expect(result.zipBytes.includes(bytes)).toBe(true);
  });

  it("fails closed on checksum mismatch", async () => {
    const bytes = pdfBytes("mismatch");
    const result = await buildDocumentExportPackage({
      uid: UID,
      generatedAt: "2026-07-29T16:00:00.000Z",
      requestId: "req_mismatch",
      documents: [
        {
          id: "doc_bad",
          domain: "labs",
          documentType: "lab_report",
          originalFilename: "bad.pdf",
          status: "stored",
          uploadedAt: "2026-07-28T12:00:00.000Z",
          schemaVersion: "1.0.0",
          byteSize: bytes.length,
          checksumSha256: "a".repeat(64),
          storageObjectId: `users/${UID}/documents/doc_bad/original`,
        },
      ],
      labUploads: [],
      jobs: [],
      extractions: [],
      readObjectBytes: async () => bytes,
    });
    expect(result.complete).toBe(false);
    expect(result.incomplete[0]).toContain("document_checksum_mismatch");
  });
});
