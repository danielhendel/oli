import {
  SYNTHETIC_DXA_EXPECTATIONS,
  SYNTHETIC_DXA_LBS_EXPECTATIONS,
  syntheticDxaAdapterInput,
  syntheticDxaDxOnlyModalityInput,
  syntheticDxaSingleSpaceLbsInput,
  syntheticDxaWhitespaceVariantInput,
  syntheticHeaderlessDxaInput,
  syntheticImageOnlyScanInput,
  syntheticNonDxaScanInput,
  syntheticQuestLabRejectInput,
} from "../__fixtures__/liveLeanRxDxaSynthetic";
import {
  detectLiveLeanRxDxa,
  extractLiveLeanRxDxa,
  hasDxaModalitySignal,
  parseCompositionHeaderLine,
  parseDxaScanDate,
} from "../extraction/liveLeanRxDxaExtractor";
import type { BodyScanExtractedField } from "@oli/contracts";

function fieldFor(fields: readonly BodyScanExtractedField[], fieldId: string) {
  return fields.find((f) => f.fieldId === fieldId);
}

describe("detectLiveLeanRxDxa", () => {
  it("claims a DXA report with a readable text layer", () => {
    expect(detectLiveLeanRxDxa(syntheticDxaAdapterInput())).toEqual({ eligible: true });
  });

  it("claims single-space lbs layouts from the same report family", () => {
    expect(detectLiveLeanRxDxa(syntheticDxaSingleSpaceLbsInput())).toEqual({ eligible: true });
  });

  it("claims whitespace and punctuation variants of the canonical layout", () => {
    expect(detectLiveLeanRxDxa(syntheticDxaWhitespaceVariantInput())).toEqual({ eligible: true });
  });

  it("claims reports that say DXA without DEXA or Lunar", () => {
    expect(detectLiveLeanRxDxa(syntheticDxaDxOnlyModalityInput())).toEqual({ eligible: true });
    expect(hasDxaModalitySignal("Whole body DXA assessment")).toBe(true);
    expect(hasDxaModalitySignal("iDXA scan")).toBe(true);
    expect(hasDxaModalitySignal("DEXA report")).toBe(true);
  });

  it("detects without depending on patient identity fields", () => {
    const input = syntheticDxaAdapterInput({
      pages: [
        {
          pageNumber: 1,
          text: [
            "GE Healthcare Lunar Prodigy",
            "Region        Region (%Fat)   Fat (g)    Lean (g)    BMC (g)   Total Mass (kg)",
            "Total         24.8            19,204     55,310      2,980     77.5",
          ].join("\n"),
        },
      ],
    });
    expect(detectLiveLeanRxDxa(input)).toEqual({ eligible: true });
  });

  it("declines an image-only report instead of guessing at values", () => {
    expect(detectLiveLeanRxDxa(syntheticImageOnlyScanInput())).toEqual({
      eligible: false,
      reasonCode: "no_text_layer",
    });
  });

  it("declines a non-DXA body composition report", () => {
    expect(detectLiveLeanRxDxa(syntheticNonDxaScanInput())).toEqual({
      eligible: false,
      reasonCode: "not_a_dxa_report",
    });
  });

  it("declines Quest lab PDFs so they are not falsely treated as DXA", () => {
    expect(detectLiveLeanRxDxa(syntheticQuestLabRejectInput())).toEqual({
      eligible: false,
      reasonCode: "not_a_dxa_report",
    });
  });

  it("declines a DXA-tagged PDF that has no composition or labelled totals", () => {
    const malformed = syntheticDxaAdapterInput({
      pages: [
        {
          pageNumber: 1,
          text: "GE Healthcare Lunar\nThis page intentionally has no composition table.",
        },
      ],
    });
    expect(detectLiveLeanRxDxa(malformed)).toEqual({
      eligible: false,
      reasonCode: "unsupported_dxa_layout",
    });
  });
});

describe("parseCompositionHeaderLine", () => {
  it("parses double-space Lunar headers", () => {
    const cols = parseCompositionHeaderLine(
      "Region        Region (%Fat)   Fat (g)    Lean (g)    BMC (g)   Total Mass (kg)",
    );
    expect(cols?.filter((c) => c.kind === "metric").map((c) => (c.kind === "metric" ? c.metricId : null))).toEqual([
      "fat_percent",
      "fat_mass",
      "lean_mass",
      "bone_mineral_content",
      "total_mass",
    ]);
  });

  it("parses single-space Total Fat % / (lbs) headers", () => {
    const cols = parseCompositionHeaderLine(
      "Region Total Fat % Total Mass (lbs) Fat Mass (lbs) Lean Mass (lbs) BMC (lbs) Fat Free (lbs)",
    );
    expect(cols?.map((c) => (c.kind === "metric" ? c.metricId : "ignore"))).toEqual([
      "fat_percent",
      "total_mass",
      "fat_mass",
      "lean_mass",
      "bone_mineral_content",
      "ignore",
    ]);
  });
});

describe("extractLiveLeanRxDxa", () => {
  const result = extractLiveLeanRxDxa(syntheticDxaAdapterInput());

  it("reads the total-body metrics from the synthetic report", () => {
    expect(fieldFor(result.fields, "total:fat_percent")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.totalFatPercent,
    );
    expect(fieldFor(result.fields, "total:fat_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.totalFatMassKg,
    );
    expect(fieldFor(result.fields, "total:lean_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.totalLeanMassKg,
    );
    expect(fieldFor(result.fields, "total:bone_mineral_content")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.totalBoneMineralContentG,
    );
    expect(fieldFor(result.fields, "total:total_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.totalMassKg,
    );
    expect(fieldFor(result.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.visceralFatMassKg,
    );
    expect(fieldFor(result.fields, "total:android_gynoid_ratio")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.androidGynoidRatio,
    );
    expect(fieldFor(result.fields, "total:bone_mineral_density")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.boneMineralDensity,
    );
  });

  it("reads both sides of each limb so lean balance can be shown", () => {
    expect(fieldFor(result.fields, "left_arm:lean_mass")?.normalizedValue).toBe(3.01);
    expect(fieldFor(result.fields, "right_arm:lean_mass")?.normalizedValue).toBe(3.166);
    expect(fieldFor(result.fields, "left_leg:lean_mass")?.normalizedValue).toBe(9.88);
    expect(fieldFor(result.fields, "right_leg:lean_mass")?.normalizedValue).toBe(9.944);
  });

  it("keeps the report's own units and never converts lean mass into muscle", () => {
    expect(fieldFor(result.fields, "total:lean_mass")?.unit).toBe("kg");
    expect(fieldFor(result.fields, "total:bone_mineral_content")?.unit).toBe("g");
    expect(fieldFor(result.fields, "total:bone_mineral_density")?.unit).toBe("g_per_cm2");
    expect(result.fields.every((f) => f.metricId !== ("skeletal_muscle_mass" as never))).toBe(true);
  });

  it("ignores tissue-only columns that exclude bone", () => {
    // Tissue %Fat (25.8) must never be mistaken for the region %Fat (24.8).
    expect(fieldFor(result.fields, "total:fat_percent")?.normalizedValue).not.toBe(25.8);
  });

  it("reads the scan date and device without inferring either", () => {
    expect(result.performedAtCandidate).toBe(SYNTHETIC_DXA_EXPECTATIONS.performedAt);
    expect(result.device).toEqual({ manufacturer: "GE Lunar", model: "iDXA" });
  });

  it("produces candidates that still require an explicit review pass", () => {
    expect(result.status).toBe("extracted");
    expect(result.scanTypeCandidate).toBe("dxa");
    expect(result.methodCandidate).toBe("dxa");
  });

  it("returns no fields for an image-only report rather than zeros", () => {
    const imageOnly = extractLiveLeanRxDxa(syntheticImageOnlyScanInput());
    expect(imageOnly.fields).toHaveLength(0);
    expect(imageOnly.status).toBe("unsupported");
    expect(imageOnly.warnings.map((w) => w.code)).toContain("composition_table_missing");
  });

  it("falls back to labelled totals when the table header is missing", () => {
    const headerless = extractLiveLeanRxDxa(syntheticHeaderlessDxaInput());
    expect(fieldFor(headerless.fields, "total:fat_percent")?.normalizedValue).toBe(24.8);
    expect(fieldFor(headerless.fields, "total:lean_mass")).toBeUndefined();
    expect(headerless.warnings.map((w) => w.code)).toContain("composition_table_missing");
  });

  it("extracts composition, VAT, A/G, bone, and lean balance from single-space lbs layouts", () => {
    const lbs = extractLiveLeanRxDxa(syntheticDxaSingleSpaceLbsInput());
    expect(lbs.status).not.toBe("unsupported");
    expect(fieldFor(lbs.fields, "total:fat_percent")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.totalFatPercent,
    );
    expect(fieldFor(lbs.fields, "total:fat_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.totalFatMassKg,
    );
    expect(fieldFor(lbs.fields, "total:lean_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.totalLeanMassKg,
    );
    expect(fieldFor(lbs.fields, "total:bone_mineral_content")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.totalBoneMineralContentG,
    );
    expect(fieldFor(lbs.fields, "total:total_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.totalMassKg,
    );
    expect(fieldFor(lbs.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.visceralFatMassKg,
    );
    expect(fieldFor(lbs.fields, "total:android_gynoid_ratio")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.androidGynoidRatio,
    );
    expect(fieldFor(lbs.fields, "total:bone_mineral_density")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.boneMineralDensity,
    );
    expect(fieldFor(lbs.fields, "left_arm:lean_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.leftArmLeanKg,
    );
    expect(fieldFor(lbs.fields, "right_arm:lean_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.rightArmLeanKg,
    );
    expect(lbs.device).toEqual({ manufacturer: "GE Lunar", model: "Prodigy" });
  });

  it("extracts labelled totals from whitespace and punctuation variants", () => {
    const variant = extractLiveLeanRxDxa(syntheticDxaWhitespaceVariantInput());
    expect(fieldFor(variant.fields, "total:fat_percent")?.normalizedValue).toBe(24.8);
    expect(fieldFor(variant.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(0.688);
    expect(fieldFor(variant.fields, "total:android_gynoid_ratio")?.normalizedValue).toBe(0.92);
    expect(fieldFor(variant.fields, "total:bone_mineral_density")?.normalizedValue).toBe(1.186);
  });

  it("does not invent VAT mass when only volume is printed", () => {
    const volumeOnly = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Healthcare Lunar Prodigy",
              "Region Total Fat % Total Mass (kg) Fat Mass (kg) Lean Mass (kg) BMC (g)",
              "Total 24.8 77.5 19.2 55.3 2980",
              "Visceral Adipose Tissue (VAT) Volume: 912 cm3",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(volumeOnly.fields, "total:visceral_fat_mass")).toBeUndefined();
  });
});

describe("parseDxaScanDate", () => {
  it("accepts an ISO scan date", () => {
    expect(parseDxaScanDate("Scan Date: 2026-02-17")).toBe("2026-02-17T00:00:00.000Z");
  });

  it("accepts an unambiguous month-first date", () => {
    expect(parseDxaScanDate("Scan Date: 02/17/2026")).toBe("2026-02-17T00:00:00.000Z");
  });

  it("refuses a date whose day/month order is ambiguous", () => {
    expect(parseDxaScanDate("Scan Date: 03/04/2026")).toBeNull();
  });

  it("returns null when no scan date is printed", () => {
    expect(parseDxaScanDate("Body Composition Report")).toBeNull();
  });
});
