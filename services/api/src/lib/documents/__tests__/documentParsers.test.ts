import { resolveDocumentParser, DOCUMENT_PARSER_REGISTRY } from "../documentParsers";

describe("documentParsers registry", () => {
  it("exposes versioned unsupported parsers without fake health fields", async () => {
    expect(DOCUMENT_PARSER_REGISTRY.length).toBeGreaterThan(0);
    for (const entry of DOCUMENT_PARSER_REGISTRY) {
      expect(entry.parser.id.length).toBeGreaterThan(0);
      expect(entry.parser.version.length).toBeGreaterThan(0);
    }

    const parser = resolveDocumentParser({ documentType: "lab_report" });
    expect(parser.id).toBe("unsupported_lab");
    const result = await parser.parse({
      documentId: "doc1",
      domain: "labs",
      documentType: "lab_report",
      mediaType: "application/pdf",
      byteSize: 100,
      checksumSha256: "a".repeat(64),
      storageObjectId: "users/u/documents/doc1/original",
      safeDisplayFilename: "DirectLabs.pdf",
    });
    expect(result.status).toBe("unsupported");
    expect(result.fields).toEqual([]);
    expect(result.provenance).toEqual([]);
    expect(result.parserVersion).toBeTruthy();
  });

  it("falls back to metadata_only for unknown types", () => {
    const parser = resolveDocumentParser({ documentType: "unknown" });
    expect(parser.id).toBe("metadata_only");
  });
});
