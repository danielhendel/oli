import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import { detectQuestTextReport } from "../detectQuestTextReport";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import { partitionLabCandidatesForAutoPublish } from "../../autoPublish/partitionLabAutoPublish";
import { evaluateLabTrendEligibility } from "../../history/evaluateLabTrendEligibility";

const CHECKSUM = "e".repeat(64);
const CREATED_AT = "2026-08-06T12:00:00.000Z";
const PHI_PATTERNS = /patient id|ssn|date of birth|dob|phone|specimen id|\b\d{3}-\d{2}-\d{4}\b/i;

function loadFixture(name: string): string {
  return readFileSync(path.join(__dirname, "..", "__fixtures__", `${name}.txt`), "utf8");
}

function pagesFor(name: string) {
  return [{ pageNumber: 1, text: loadFixture(name) }];
}

function draftFor(name: string) {
  return extractQuestLabReportDraft({
    documentId: "doc_hist",
    userId: "uid_hist",
    draftId: "draft_hist",
    checksumSha256: CHECKSUM,
    pages: pagesFor(name),
    createdAt: CREATED_AT,
  });
}

function detectFor(name: string) {
  const text = loadFixture(name);
  const textCharCount = text.replace(/\s+/g, " ").trim().length;
  return detectQuestTextReport({ fullText: text, pageCount: 1, textCharCount });
}

function expectNoPhi(draft: ReturnType<typeof extractQuestLabReportDraft>) {
  const blob = JSON.stringify(draft);
  expect(blob).not.toMatch(PHI_PATTERNS);
}

function expectCollectedCalendar(
  draft: ReturnType<typeof extractQuestLabReportDraft>,
  calendarDate: string,
  options?: { dateOnly?: boolean },
) {
  expect(draft.reportCandidate.collectedAtSource?.sourceCalendarDate).toBe(calendarDate);
  if (options?.dateOnly ?? draft.reportCandidate.collectedAtPrecision === "date_only") {
    expect(draft.reportCandidate.collectedAt).toBe(`${calendarDate}T00:00:00.000Z`);
  } else {
    expect(draft.reportCandidate.collectedAt?.startsWith(`${calendarDate}T`)).toBe(true);
  }
}

describe("historical Quest layout fixtures (Phase 3D-B)", () => {
  describe("quest_2020_basic_health_profile_v1", () => {
    const fixture = "quest_2020_basic_health_profile_v1";

    it("is supported by detectQuestTextReport", () => {
      const detection = detectFor(fixture);
      expect(detection.supported).toBe(true);
      if (!detection.supported) return;
      expect(detection.hasCardioIq).toBe(false);
      expect(detection.formatFamily).not.toBe("quest_cardio_iq_text_v1");
    });

    it("extracts reviewable candidates with correct collection metadata", () => {
      const draft = draftFor(fixture);
      expect(draft.status).not.toBe("unsupported");
      expectCollectedCalendar(draft, "2020-06-05");
      expect(draft.reportCandidate.fasting).toBe(true);
      expectNoPhi(draft);
    });

    it("maps CBC/CMP/lipid numerics and qualitative urinalysis", () => {
      const draft = draftFor(fixture);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "ldl_c")).toBe(true);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "glucose")).toBe(true);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "wbc")).toBe(true);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "non_hdl_c")).toBe(true);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "egfr")).toBe(true);

      const urineProteinMatched = draft.results.find((r) => r.rawAnalyteLabel === "PROTEIN");
      const urineBloodMatched = draft.results.find((r) => r.rawAnalyteLabel === "BLOOD");
      const urineProtein =
        urineProteinMatched ?? draft.unmatched.find((u) => u.rawAnalyteLabel === "PROTEIN");
      const urineBlood =
        urineBloodMatched ?? draft.unmatched.find((u) => u.rawAnalyteLabel === "BLOOD");
      expect(urineProtein?.rawResult).toBe("Negative");
      expect(urineBlood?.rawResult).toBe("Negative");
      expect(urineProteinMatched?.result?.kind).not.toBe("numeric");
      expect(urineBloodMatched?.result?.kind).not.toBe("numeric");

      const labels = [...draft.results, ...draft.unmatched].map((c) => c.rawAnalyteLabel);
      expect(labels.some((l) => /desired\s+range|verified by laboratory director/i.test(l))).toBe(false);
    });

    it("segments basic health profile and urinalysis panels", () => {
      const draft = draftFor(fixture);
      const panelNames = draft.panels.map((p) => p.name.toUpperCase());
      expect(panelNames.some((n) => n.includes("BASIC HEALTH"))).toBe(true);
      expect(panelNames.some((n) => n.includes("URINALYSIS"))).toBe(true);
      expect(draft.reportCandidate.reportFamily).not.toBe("quest_cardio_iq_text_v1");
    });
  });

  describe("quest_2020_basic_health_profile_fragmented_v1", () => {
    const fixture = "quest_2020_basic_health_profile_fragmented_v1";

    it("is supported and extracts collection date from split metadata", () => {
      expect(detectFor(fixture).supported).toBe(true);
      const draft = draftFor(fixture);
      expect(draft.status).not.toBe("unsupported");
      expectCollectedCalendar(draft, "2020-06-05");
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "ldl_c")).toBe(true);
    });
  });

  describe("quest_2020_standard_v1", () => {
    const fixture = "quest_2020_standard_v1";

    it("is supported and not Cardio IQ family", () => {
      const detection = detectFor(fixture);
      expect(detection.supported).toBe(true);
      if (!detection.supported) return;
      expect(detection.hasCardioIq).toBe(false);
      expect(detection.formatFamily).toBe("quest_text_pdf_v1");
    });

    it("records non-fasting collection and HOMA-IR not_applicable", () => {
      const draft = draftFor(fixture);
      expect(draft.status).not.toBe("unsupported");
      expectCollectedCalendar(draft, "2020-09-24", { dateOnly: true });
      expect(draft.reportCandidate.fasting).toBe(false);
      expectNoPhi(draft);

      const homa =
        draft.results.find((r) => r.aliasMatch.canonicalMetricId === "homa_ir") ??
        draft.results.find((r) => r.rawAnalyteLabel === "HOMA-IR");
      expect(homa?.result).toEqual({ kind: "not_reported", reason: "not_applicable" });
    });
  });

  describe("quest_2021_qualitative_antibody_v1", () => {
    const fixture = "quest_2021_qualitative_antibody_v1";

    it("is supported as base Quest text family", () => {
      const detection = detectFor(fixture);
      expect(detection.supported).toBe(true);
      if (!detection.supported) return;
      expect(detection.hasCardioIq).toBe(false);
    });

    it("extracts qualitative SARS antibodies without numeric coercion", () => {
      const draft = draftFor(fixture);
      expect(draft.status).not.toBe("unsupported");
      expectCollectedCalendar(draft, "2021-04-13");
      expectNoPhi(draft);

      const iggMatched = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "sars_cov2_igg");
      const igmMatched = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "sars_cov2_igm");
      expect(iggMatched?.rawResult).toBe("POSITIVE");
      expect(igmMatched?.rawResult).toBe("POSITIVE");
      expect(iggMatched?.result?.kind).toBe("qualitative");
      expect(igmMatched?.result?.kind).toBe("qualitative");
      expect(iggMatched?.rawReferenceRange).toBe("NEGATIVE");
      expect(igmMatched?.rawReferenceRange).toBe("NEGATIVE");

      const labels = [...draft.results, ...draft.unmatched].map((c) => c.rawAnalyteLabel);
      expect(labels.some((l) => /interpretation guide|index value|note 1|fda eua/i.test(l))).toBe(false);
      expect(labels.some((l) => /^<1\.00$/i.test(l))).toBe(false);

      for (const row of [iggMatched, igmMatched]) {
        if (!row?.result) continue;
        expect(
          evaluateLabTrendEligibility({
            result: row.result,
            normalizedUnit: row.unit.normalizedUnit,
            collectedAt: draft.reportCandidate.collectedAt ?? null,
          }),
        ).toBe("qualitative");
      }

      const partition = partitionLabCandidatesForAutoPublish(draft);
      expect(partition.autoPublishable.some((p) => p.candidate.aliasMatch.canonicalMetricId === "sars_cov2_igg")).toBe(
        true,
      );
      expect(partition.autoPublishable.some((p) => p.candidate.aliasMatch.canonicalMetricId === "sars_cov2_igm")).toBe(
        true,
      );
    });
  });

  describe("quest_2021_qualitative_antibody_fragmented_v1", () => {
    const fixture = "quest_2021_qualitative_antibody_fragmented_v1";

    it("is supported and extracts fragmented antibody rows", () => {
      expect(detectFor(fixture).supported).toBe(true);
      const draft = draftFor(fixture);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "sars_cov2_igg")).toBe(true);
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "sars_cov2_igm")).toBe(true);
    });
  });

  describe("quest_2022_standard_v1", () => {
    const fixture = "quest_2022_standard_v1";

    it("is supported and not Cardio IQ family", () => {
      const detection = detectFor(fixture);
      expect(detection.supported).toBe(true);
      if (!detection.supported) return;
      expect(detection.hasCardioIq).toBe(false);
      expect(detection.formatFamily).not.toBe("quest_cardio_iq_text_v1");
    });

    it("extracts PSA, iron, testosterone, and calculated non-HDL", () => {
      const draft = draftFor(fixture);
      expect(draft.status).not.toBe("unsupported");
      expectCollectedCalendar(draft, "2022-07-07", { dateOnly: true });
      expect(draft.reportCandidate.fasting).toBe(true);
      expectNoPhi(draft);

      const psa =
        draft.results.find((r) => r.aliasMatch.canonicalMetricId === "psa") ??
        draft.results.find((r) => /psa/i.test(r.rawAnalyteLabel)) ??
        draft.unmatched.find((u) => /psa/i.test(u.rawAnalyteLabel));
      const testosterone =
        draft.results.find((r) => r.aliasMatch.canonicalMetricId === "total_testosterone") ??
        draft.unmatched.find((u) => /testosterone/i.test(u.rawAnalyteLabel));
      const iron =
        draft.results.find((r) => r.aliasMatch.canonicalMetricId === "iron") ??
        draft.unmatched.find((u) => /iron/i.test(u.rawAnalyteLabel));
      expect(psa).toBeDefined();
      expect(testosterone).toBeDefined();
      expect(iron).toBeDefined();
      expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "non_hdl_c")).toBe(true);
      expect(draft.reportCandidate.reportFamily).not.toBe("quest_cardio_iq_text_v1");
    });
  });
});
