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
      "fat_free_mass",
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
    expect(fieldFor(result.fields, "total:fat_free_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.totalFatFreeMassKg,
    );
    expect(fieldFor(result.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.visceralFatMassKg,
    );
    expect(fieldFor(result.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(
      SYNTHETIC_DXA_EXPECTATIONS.visceralFatVolumeCm3,
    );
    expect(fieldFor(result.fields, "total:visceral_fat_volume")?.unit).toBe("cm3");
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
    expect(fieldFor(lbs.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.visceralFatVolumeCm3,
    );
    expect(fieldFor(lbs.fields, "total:fat_free_mass")?.normalizedValue).toBe(
      SYNTHETIC_DXA_LBS_EXPECTATIONS.totalFatFreeMassKg,
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
    expect(fieldFor(volumeOnly.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(912);
  });

  it("does not invent VAT volume when only mass is printed", () => {
    const massOnly = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Healthcare Lunar Prodigy",
              "DXA",
              "VAT Mass: 688 g",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(massOnly.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(0.688);
    expect(fieldFor(massOnly.fields, "total:visceral_fat_volume")).toBeUndefined();
  });

  it("emits both VAT mass and volume when both are source-reported", () => {
    const both = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Healthcare Lunar iDXA",
              "VAT 688 g 912 cm3",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(both.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(0.688);
    expect(fieldFor(both.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(912);
  });

  it("converts VAT volume from in³ to cm³ without inventing mass", () => {
    const inches = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: ["GE Lunar DXA", "VAT Volume: 10 in3"].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(inches.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(
      Number((10 * 2.54 ** 3).toFixed(4)),
    );
    expect(fieldFor(inches.fields, "total:visceral_fat_mass")).toBeUndefined();
  });

  it("preserves non-integer A/G precision (no integer truncation)", () => {
    const ag = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "A/G Ratio 1.0",
              "Android/Gynoid Ratio: 1.15",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(ag.fields, "total:android_gynoid_ratio")?.normalizedValue).toBe(1.15);
    expect(fieldFor(ag.fields, "total:android_gynoid_ratio")?.rawValue).toBe("1.15");
  });

  it("emits fat-free mass when labelled and keeps it distinct from lean mass", () => {
    const ffm = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Lean Mass: 55.31 kg",
              "Fat-Free Mass: 58.29 kg",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(ffm.fields, "total:fat_free_mass")?.normalizedValue).toBe(58.29);
    expect(fieldFor(ffm.fields, "total:lean_mass")).toBeUndefined();
  });

  it("does not emit fat-free mass when the source omits it", () => {
    const noFfm = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Region Total Fat % Total Mass (kg) Fat Mass (kg) Lean Mass (kg) BMC (g)",
              "Total 24.8 77.5 19.2 55.3 2980",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(noFfm.fields, "total:fat_free_mass")).toBeUndefined();
  });

  it("does not emit T-score or Z-score (Stage 3E deferred)", () => {
    const bone = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Total Body BMD: 1.186 g/cm2",
              "T-score: -0.4",
              "Z-score: 0.2",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(bone.fields, "total:bone_mineral_density")?.normalizedValue).toBe(1.186);
    expect(bone.fields.every((f) => !/t_score|z_score/i.test(f.metricId))).toBe(true);
  });

  it("extracts VAT volume from pdfjs header-column layout without inventing mass", () => {
    const headerCol = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Healthcare Lunar iDXA",
              "Adipose Indices",
              "VAT",
              "Mass (g) Volume (in3)",
              "-- 10.0",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(headerCol.fields, "total:visceral_fat_mass")).toBeUndefined();
    expect(fieldFor(headerCol.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(
      Number((10 * 2.54 ** 3).toFixed(4)),
    );
    expect(fieldFor(headerCol.fields, "total:visceral_fat_volume")?.unit).toBe("cm3");
  });

  it("extracts both VAT mass and volume from fragmented header-column rows", () => {
    const both = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "VAT",
              "Mass",
              "(g)",
              "Volume",
              "(cm3)",
              "688",
              "912",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(both.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(0.688);
    expect(fieldFor(both.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(912);
  });

  it("extracts both VAT columns when values share one row under Mass/Volume headers", () => {
    const both = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: ["GE Lunar DXA", "VAT", "Mass (g) Volume (cm3)", "688 912"].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(both.fields, "total:visceral_fat_mass")?.normalizedValue).toBe(0.688);
    expect(fieldFor(both.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(912);
  });

  it("extracts VAT volume from Age/Fat Mass/Volume header with leading row label", () => {
    const lunar = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar iDXA",
              "VAT (Visceral Adipose Tissue)",
              "Est. Age Fat Mass (g) Volume (in3)",
              "Android 44.0 -- 11.5",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(lunar.fields, "total:visceral_fat_mass")).toBeUndefined();
    expect(fieldFor(lunar.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(
      Number((11.5 * 2.54 ** 3).toFixed(4)),
    );
  });

  it("does not emit VAT mass from Fat Mass column (volume only) under Est. Age headers", () => {
    const volOnly = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar iDXA",
              "Visceral Adipose Tissue (VAT)",
              "Est. Age Fat Mass (lbs) Volume (in3)",
              "01/15/2024 44.0 2.5 11.5",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(volOnly.fields, "total:visceral_fat_mass")).toBeUndefined();
    expect(fieldFor(volOnly.fields, "total:visceral_fat_volume")?.normalizedValue).toBe(
      Number((11.5 * 2.54 ** 3).toFixed(4)),
    );
  });

  it("rejects VAT false positives from unrelated mass/volume prose", () => {
    const neg = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "The sample volume was calibrated.",
              "Total Mass (kg) is listed below.",
              "Region Total Fat % Total Mass (kg) Fat Mass (kg) Lean Mass (kg) BMC (g)",
              "Total 24.8 77.5 19.2 55.3 2980",
              "Mass Volume",
              "12 34",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(neg.fields, "total:visceral_fat_volume")).toBeUndefined();
    expect(fieldFor(neg.fields, "total:visceral_fat_mass")).toBeUndefined();
  });

  it("extracts Total Body BMD from Region|BMD|T|Z header-column layout without T/Z", () => {
    const table = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Bone Summary",
              "Region BMD (g/cm2) Young Adult Age Matched",
              "Total 1.142 -0.3 0.4",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(table.fields, "total:bone_mineral_density")?.normalizedValue).toBe(1.142);
    expect(fieldFor(table.fields, "total:bone_mineral_density")?.unit).toBe("g_per_cm2");
    expect(table.fields.every((f) => !/t_score|z_score/i.test(f.metricId))).toBe(true);
    // Ensure T/Z numerics were not stored as BMD.
    expect(fieldFor(table.fields, "total:bone_mineral_density")?.normalizedValue).not.toBe(-0.3);
    expect(fieldFor(table.fields, "total:bone_mineral_density")?.normalizedValue).not.toBe(0.4);
  });

  it("extracts BMD from fragmented pdfjs Region/BMD headers + values row", () => {
    const frag = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Region",
              "BMD",
              "(g/cm2)",
              "Young Adult",
              "Age Matched",
              "Total",
              "1.205",
              "-0.1",
              "0.2",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(frag.fields, "total:bone_mineral_density")?.normalizedValue).toBe(1.205);
  });

  it("extracts Total Body BMD from fully fragmented Region/BMD/T/Z with regional rows", () => {
    const frag = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Bone Summary",
              "Region",
              "BMD",
              "(g/cm²)",
              "Young",
              "Adult",
              "Age",
              "Matched",
              "Head 1.234 -- --",
              "Arms 1.101 -- --",
              "Legs 1.250 -- --",
              "Total 1.178 -0.2 0.5",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(frag.fields, "total:bone_mineral_density")?.normalizedValue).toBe(1.178);
    expect(frag.fields.every((f) => !/t_score|z_score/i.test(f.metricId))).toBe(true);
    expect(fieldFor(frag.fields, "total:bone_mineral_density")?.normalizedValue).not.toBe(1.234);
    expect(fieldFor(frag.fields, "total:bone_mineral_density")?.normalizedValue).not.toBe(-0.2);
  });

  it("rejects BMD false positives from BMC and prose", () => {
    const neg = extractLiveLeanRxDxa(
      syntheticDxaAdapterInput({
        pages: [
          {
            pageNumber: 1,
            text: [
              "GE Lunar DXA",
              "Region Total Fat % Fat (g) Lean (g) BMC (g) Total Mass (kg)",
              "Total 24.8 19204 55310 2980 77.5",
              "Bone mineral density is discussed in the narrative without a table.",
              "T-score -0.4",
              "Z-score 0.2",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(fieldFor(neg.fields, "total:bone_mineral_density")).toBeUndefined();
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
