import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";

const CHECKSUM = "b".repeat(64);
const CREATED_AT = "2026-07-28T15:00:00.000Z";

function loadFixture(name: string): string {
  return readFileSync(path.join(__dirname, "..", "__fixtures__", `${name}.txt`), "utf8");
}

function draftFor(name: string) {
  const text = loadFixture(name);
  return extractQuestLabReportDraft({
    documentId: "doc_1",
    userId: "uid_1",
    draftId: "draft_1",
    checksumSha256: CHECKSUM,
    pages: [{ pageNumber: 1, text }],
    createdAt: CREATED_AT,
  });
}

describe("extractQuestLabReportDraft", () => {
  it("produces review_needed candidates for the comprehensive Quest fixture", () => {
    const draft = draftFor("quest_comprehensive_v1");
    expect(draft.status).toBe("review_needed");
    expect(draft.results.length).toBeGreaterThan(0);
    expect(draft.documentId).toBe("doc_1");
    expect(draft.userId).toBe("uid_1");
    expect(draft.sourceChecksumSha256).toBe(CHECKSUM);
    expect(draft.parser.id).toBe("quest_text_pdf_v1");
  });

  it("preserves inequalities on the comprehensive fixture rather than flattening them", () => {
    const draft = draftFor("quest_comprehensive_v1");
    const lpa = draft.results.find((r) => r.rawAnalyteLabel === "LIPOPROTEIN (a)");
    expect(lpa).toBeDefined();
    expect(lpa?.result).toEqual({ kind: "numeric", value: 4, comparator: "lt" });
    expect(lpa?.rawResult).toBe("<4");
  });

  it("marks the Cardio IQ LDL-P result as high via the source flag", () => {
    const draft = draftFor("quest_comprehensive_v1");
    const ldlp = draft.results.find((r) => r.rawAnalyteLabel === "LDL-P");
    expect(ldlp?.flag).toEqual(
      expect.objectContaining({ rawFlag: "H", normalized: "high" }),
    );
  });

  it("never invents patient identifiers anywhere in the draft", () => {
    const draft = draftFor("quest_comprehensive_v1");
    const serialized = JSON.stringify(draft).toLowerCase();
    expect(serialized).not.toContain("patient");
    expect(serialized).not.toContain("date of birth");
    expect(serialized).not.toContain("dob");
  });

  it("routes an unmatched analyte to unmatched rather than inventing a canonical match", () => {
    const draft = draftFor("quest_comprehensive_v1");
    expect(draft.unmatched.some((u) => u.rawAnalyteLabel === "HEPATITIS C AB")).toBe(true);
  });

  it("preserves NOT APPLICABLE as a typed not_reported result (mixed-types fixture)", () => {
    const draft = draftFor("quest_mixed_types_v1");
    const homaIr = draft.results.find((r) => r.rawAnalyteLabel === "HOMA-IR");
    expect(homaIr?.result).toEqual({ kind: "not_reported", reason: "not_applicable" });
  });

  it("routes Pattern B results to unmatched when the analyte label is unrecognized (mixed-types fixture)", () => {
    const draft = draftFor("quest_mixed_types_v1");
    const anaPattern = draft.unmatched.find((u) => u.rawAnalyteLabel === "ANA PATTERN");
    expect(anaPattern).toBeDefined();
    expect(anaPattern?.rawResult).toBe("Pattern B");
  });

  it("returns an unsupported draft with no candidates for an image-only document", () => {
    const draft = draftFor("image_only_stub");
    expect(draft.status).toBe("unsupported");
    expect(draft.results).toEqual([]);
    expect(draft.unmatched).toEqual([]);
    expect(draft.panels).toEqual([]);
    expect(draft.warnings.length).toBeGreaterThan(0);
  });

  it("returns an unsupported draft for a provider without Quest-family signatures", () => {
    const draft = draftFor("unsupported_provider");
    expect(draft.status).toBe("unsupported");
    expect(draft.results).toEqual([]);
  });

  it("keeps provenance page numbers and checksum linkage on every candidate", () => {
    const draft = draftFor("quest_comprehensive_v1");
    for (const result of draft.results) {
      expect(result.provenance.sourceDocumentId).toBe("doc_1");
      expect(result.provenance.sourceChecksumSha256).toBe(CHECKSUM);
      expect(result.provenance.sourcePage).toBeGreaterThan(0);
    }
  });
});
