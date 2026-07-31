import { resolveDocumentParser, resolveDocumentParserForInput, DOCUMENT_PARSER_REGISTRY } from "../documentParsers";

describe("documentParsers registry", () => {
  it("exposes versioned parsers without fake health fields for stubs", async () => {
    expect(DOCUMENT_PARSER_REGISTRY.length).toBeGreaterThan(0);
    for (const entry of DOCUMENT_PARSER_REGISTRY) {
      expect(entry.parser.id.length).toBeGreaterThan(0);
      expect(entry.parser.version.length).toBeGreaterThan(0);
    }

    // Minimal %PDF header — no text layer; Quest should decline, cascade to unsupported_lab.
    const input = {
      documentId: "doc1",
      domain: "labs" as const,
      documentType: "lab_report" as const,
      mediaType: "application/pdf" as const,
      byteSize: 100,
      checksumSha256: "a".repeat(64),
      storageObjectId: "users/u/documents/doc1/original",
      safeDisplayFilename: "DirectLabs.pdf",
      fileBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    };
    const parser = await resolveDocumentParserForInput({
      documentType: "lab_report",
      input,
    });
    expect(["quest_text_pdf_v1", "unsupported_lab"]).toContain(parser.id);
    const result = await parser.parse(input);
    expect(result.status).toBe("unsupported");
    expect(result.fields).toEqual([]);
    expect(result.parserVersion).toBeTruthy();
  });

  it("falls back for unknown types via sync resolve", () => {
    const parser = resolveDocumentParser({ documentType: "unknown" });
    expect(["quest_text_pdf_v1", "metadata_only", "unsupported_lab"]).toContain(parser.id);
  });
});
