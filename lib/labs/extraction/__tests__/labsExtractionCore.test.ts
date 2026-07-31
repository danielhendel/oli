import { matchLabAnalyteAlias } from "../matchLabAnalyteAlias";
import { parseLabUnitCandidate, unitsAreTrendCompatible } from "../parseLabUnit";
import { parseLabReferenceRange } from "../parseLabReferenceRange";
import { parseLabFlagCandidate } from "../parseLabFlag";
import { detectQuestTextReport } from "../detectQuestTextReport";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import fs from "fs";
import path from "path";

const checksum = "b".repeat(64);

describe("parseLabUnitCandidate", () => {
  it("preserves raw and normalizes known units", () => {
    const u = parseLabUnitCandidate("mg/dl");
    expect(u.rawUnit).toBe("mg/dl");
    expect(u.normalizedUnit).toBe("mg/dL");
    expect(u.known).toBe(true);
  });

  it("marks unknown units without converting values", () => {
    const u = parseLabUnitCandidate("frobnitz");
    expect(u.known).toBe(false);
    expect(u.normalizedUnit).toBeNull();
  });

  it("checks trend unit compatibility", () => {
    expect(unitsAreTrendCompatible("mg/dL", "mg/dL")).toBe(true);
    expect(unitsAreTrendCompatible("mg/dL", "mmol/L")).toBe(false);
  });
});

describe("parseLabReferenceRange", () => {
  it("parses closed numeric ranges", () => {
    const r = parseLabReferenceRange("65-99");
    expect(r?.structured.kind).toBe("numeric_range");
  });

  it("parses qualitative expected", () => {
    const r = parseLabReferenceRange("Negative");
    expect(r?.structured).toEqual({ kind: "qualitative_expected", expectedValues: ["Negative"] });
  });

  it("falls back to raw_only when ambiguous", () => {
    const r = parseLabReferenceRange("see footnote *");
    expect(r?.structured.kind).toBe("raw_only");
  });
});

describe("parseLabFlagCandidate", () => {
  it("maps high/low/positive", () => {
    expect(parseLabFlagCandidate("H").normalized).toBe("high");
    expect(parseLabFlagCandidate("L").normalized).toBe("low");
    expect(parseLabFlagCandidate("POSITIVE").normalized).toBe("positive");
  });

  it("labels provider categories distinctly", () => {
    expect(parseLabFlagCandidate("Optimal").normalized).toBe("provider_category");
  });
});

describe("matchLabAnalyteAlias", () => {
  it("matches exact aliases and canonical forms", () => {
    expect(matchLabAnalyteAlias("LDL-CHOLESTEROL").canonicalMetricId).toBe("ldl_c");
    expect(matchLabAnalyteAlias("HbA1c").canonicalMetricId).toBe("hba1c");
    expect(matchLabAnalyteAlias("ApoB").canonicalMetricId).toBe("apob");
    expect(matchLabAnalyteAlias("Lp(a)").canonicalMetricId).toBe("lpa");
  });

  it("leaves unknown labels unmatched without fuzzy guess", () => {
    const m = matchLabAnalyteAlias("COMPLETELY UNKNOWN MARKER ZZ");
    expect(m.matchMethod).toBe("unmatched");
    expect(m.canonicalMetricId).toBeNull();
    expect(m.requiresReview).toBe(true);
  });
});

describe("detectQuestTextReport", () => {
  it("supports quest comprehensive fixture", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/quest_comprehensive_v1.txt"),
      "utf8",
    );
    const d = detectQuestTextReport({ fullText: text, pageCount: 1, textCharCount: text.length });
    expect(d.supported).toBe(true);
  });

  it("rejects image-only stubs", () => {
    const text = fs.readFileSync(path.join(__dirname, "../__fixtures__/image_only_stub.txt"), "utf8");
    const d = detectQuestTextReport({ fullText: text, pageCount: 1, textCharCount: text.length });
    expect(d.supported).toBe(false);
    if (!d.supported) expect(d.reasonCode).toBe("scanned_pdf_no_text");
  });

  it("rejects unsupported providers", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/unsupported_provider.txt"),
      "utf8",
    );
    const d = detectQuestTextReport({ fullText: text, pageCount: 1, textCharCount: text.length });
    expect(d.supported).toBe(false);
  });
});

describe("extractQuestLabReportDraft", () => {
  it("extracts matched candidates with provenance and preserves inequalities", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/quest_comprehensive_v1.txt"),
      "utf8",
    );
    const draft = extractQuestLabReportDraft({
      documentId: "doc1",
      userId: "user1",
      draftId: "draft1",
      checksumSha256: checksum,
      pages: [{ pageNumber: 1, text }],
      createdAt: "2024-03-16T00:00:00.000Z",
    });
    expect(draft.status).toBe("review_needed");
    expect(draft.results.length).toBeGreaterThan(10);
    const lpa = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "lpa");
    expect(lpa?.result).toEqual({ kind: "numeric", value: 4, comparator: "lt" });
    expect(draft.results.every((r) => r.provenance.sourcePage >= 1)).toBe(true);
    expect(draft.results.every((r) => r.provenance.sourceLocator.length > 0)).toBe(true);
    const blob = JSON.stringify(draft);
    expect(blob).not.toMatch(/patient id|ssn|date of birth/i);
  });

  it("handles mixed qualitative and pattern results as unmatched when no catalog id", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/quest_mixed_types_v1.txt"),
      "utf8",
    );
    const draft = extractQuestLabReportDraft({
      documentId: "doc2",
      userId: "user1",
      draftId: "draft2",
      checksumSha256: checksum,
      pages: [{ pageNumber: 1, text }],
      createdAt: "2024-03-16T00:00:00.000Z",
    });
    const homa = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "homa_ir");
    expect(homa?.result).toEqual({ kind: "not_reported", reason: "not_applicable" });
    expect(draft.unmatched.some((u) => /pattern/i.test(u.rawResult) || /ANA/i.test(u.rawAnalyteLabel))).toBe(
      true,
    );
  });
});
