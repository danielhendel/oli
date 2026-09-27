/**
 * Synthetic DXA report text fixtures.
 *
 * FIXTURE POLICY: every value here is invented. These are not, and must never become,
 * copies of a real report. No names, dates of birth, record numbers, facility details, or
 * any other identifier appear in this file, and no real PDF is committed to the repo.
 * The layout mirrors a GE Lunar / Live Lean Rx style text layer so the extractor is
 * exercised realistically; the numbers are altered and internally consistent only.
 */

import type { BodyScanAdapterInput } from "../bodyScanAdapter";

const DXA_PAGE_1 = [
  "Body Composition Report",
  "GE Healthcare Lunar iDXA",
  "Scan Date: 2026-02-17",
  "",
  "Region        Tissue (%Fat)   Region (%Fat)   Tissue (g)   Fat (g)    Lean (g)    BMC (g)   Total Mass (kg)",
  "Left Arm      31.8            30.5            4,412        1,402      3,010       168       4.6",
  "Right Arm     29.7            28.6            4,504        1,338      3,166       174       4.7",
  "Trunk         25.4            24.8            35,435       9,015      26,420      880       36.3",
  "Left Leg      24.0            23.1            13,000       3,120      9,880       520       13.5",
  "Right Leg     24.3            23.3            13,134       3,190      9,944       532       13.7",
  "Android       28.9            27.9            5,210        1,506      3,704       96        5.3",
  "Gynoid        31.4            30.2            11,840       3,718      8,122       420       12.3",
  "Total         25.8            24.8            74,514       19,204     55,310      2,980     77.5",
].join("\n");

const DXA_PAGE_2 = [
  "Adipose Indices",
  "Total Body % Fat: 24.8 %",
  "Visceral Adipose Tissue (VAT) Mass: 688 g",
  "Android/Gynoid Ratio: 0.92",
  "",
  "Bone Summary",
  "Total Body BMD: 1.186 g/cm2",
].join("\n");

export function syntheticDxaAdapterInput(
  overrides: Partial<BodyScanAdapterInput> = {},
): BodyScanAdapterInput {
  const pages = overrides.pages ?? [
    { pageNumber: 1, text: DXA_PAGE_1 },
    { pageNumber: 2, text: DXA_PAGE_2 },
  ];
  const textCharCount =
    overrides.textCharCount ?? pages.reduce((sum, page) => sum + page.text.length, 0);
  return {
    documentId: "doc_synthetic_dxa",
    scanId: "doc_synthetic_dxa",
    checksumSha256: "a".repeat(64),
    pageCount: pages.length,
    textWarningCodes: [],
    ...overrides,
    pages,
    textCharCount,
  };
}

/** An image-only export: the PDF carries no text layer, so no adapter may claim it. */
export function syntheticImageOnlyScanInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [{ pageNumber: 1, text: "" }],
    textCharCount: 0,
    textWarningCodes: ["scanned_pdf_no_text"],
  });
}

/** A non-DXA scan export (bioelectrical impedance), which the DXA adapter must decline. */
export function syntheticNonDxaScanInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [
      {
        pageNumber: 1,
        text: [
          "Body Composition Analysis",
          "Bioelectrical Impedance Analyzer",
          "Percent Body Fat   22.4 %",
          "Skeletal Muscle    33.1 kg",
        ].join("\n"),
      },
    ],
  });
}

/** A DXA report whose composition table lost its header row during text extraction. */
export function syntheticHeaderlessDxaInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [
      {
        pageNumber: 1,
        text: [
          "GE Healthcare Lunar iDXA",
          "Total Body % Fat: 24.8 %",
          "Total         25.8            24.8            74,514       19,204     55,310      2,980     77.5",
        ].join("\n"),
      },
    ],
  });
}

export const SYNTHETIC_DXA_EXPECTATIONS = {
  totalFatPercent: 24.8,
  totalFatMassKg: 19.204,
  totalLeanMassKg: 55.31,
  totalBoneMineralContentG: 2980,
  totalMassKg: 77.5,
  visceralFatMassKg: 0.688,
  androidGynoidRatio: 0.92,
  boneMineralDensity: 1.186,
  performedAt: "2026-02-17T00:00:00.000Z",
} as const;

/**
 * Single-space pdfjs-style layout with (lbs) columns — models a common real GE Lunar /
 * Live Lean text-layer reconstruction without copying any personal report content.
 * Invented numbers only.
 */
const DXA_SINGLE_SPACE_LBS = [
  "Body Composition",
  "Live Lean Rx",
  "GE Healthcare Lunar Prodigy",
  "Scan Date: 2026-03-08",
  "",
  "Region Total Fat % Total Mass (lbs) Fat Mass (lbs) Lean Mass (lbs) BMC (lbs) Fat Free (lbs)",
  "Left Arm 30.5% 10.1 3.1 lbs 6.8 lbs 0.37 lbs 7.2 lbs",
  "Right Arm 28.6% 10.4 3.0 lbs 7.0 lbs 0.38 lbs 7.4 lbs",
  "Trunk 24.8% 80.0 19.9 lbs 58.2 lbs 1.94 lbs 60.1 lbs",
  "Left Leg 23.1% 29.8 6.9 lbs 21.8 lbs 1.15 lbs 22.9 lbs",
  "Right Leg 23.3% 30.2 7.0 lbs 21.9 lbs 1.17 lbs 23.1 lbs",
  "Android 27.9% 11.7 3.3 lbs 8.2 lbs 0.21 lbs 8.4 lbs",
  "Gynoid 30.2% 27.1 8.2 lbs 17.9 lbs 0.93 lbs 18.8 lbs",
  "Total 24.8% 170.9 42.3 lbs 121.9 lbs 6.57 lbs 128.5 lbs",
  "",
  "Adipose Indices",
  "Total Fat % 24.8 %",
  "VAT Mass: 688 g",
  "Young Adult A/G Ratio (no units) 0.92",
  "Bone Summary",
  "BMD: 1.186 g/cm2",
  "",
  "Left / Right Diff Arms Lean Mass (lbs) Lean % Fat Mass (lbs) Fat % Total Mass (lbs)",
  "Right Arm 7.0 70.0 3.0 28.6 10.4",
  "Left Arm 6.8 68.0 3.1 30.5 10.1",
].join("\n");

/** Whitespace / punctuation / wrapping variants of the canonical synthetic family. */
export function syntheticDxaWhitespaceVariantInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [
      {
        pageNumber: 1,
        text: [
          "Body Composition Report",
          "GE Healthcare",
          "Lunar   iDXA",
          "Scan Date:2026-02-17",
          "",
          "Region   Region (%Fat)   Fat (g)   Lean (g)   BMC (g)   Total Mass (kg)",
          "Total    24.8            19,204    55,310    2,980     77.5",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        text: [
          "Total Body % Fat:24.8%",
          "Visceral Adipose Tissue (VAT) Mass:688g",
          "Android / Gynoid Ratio:0.92",
          "Total Body BMD:1.186 g/cm²",
        ].join("\n"),
      },
    ],
  });
}

/** Single-space + lbs layout that mirrors pdfjs reconstruction of the report family. */
export function syntheticDxaSingleSpaceLbsInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [{ pageNumber: 1, text: DXA_SINGLE_SPACE_LBS }],
  });
}

/** DXA modality spelled without "DEXA" or "Lunar" — must still detect via DXA token. */
export function syntheticDxaDxOnlyModalityInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [
      {
        pageNumber: 1,
        text: [
          "Body Composition Report",
          "DXA Whole Body",
          "Scan Date: 2026-02-17",
          "Region        Region (%Fat)   Fat (g)    Lean (g)    BMC (g)   Total Mass (kg)",
          "Total         24.8            19,204     55,310      2,980     77.5",
          "Total Body % Fat: 24.8 %",
        ].join("\n"),
      },
    ],
  });
}

/** Quest-style lab PDF text — must never be claimed by the DXA adapter. */
export function syntheticQuestLabRejectInput(): BodyScanAdapterInput {
  return syntheticDxaAdapterInput({
    pages: [
      {
        pageNumber: 1,
        text: [
          "Quest Diagnostics",
          "Comprehensive Metabolic Panel",
          "Glucose  98  mg/dL",
          "Creatinine  0.9  mg/dL",
        ].join("\n"),
      },
    ],
  });
}

export const SYNTHETIC_DXA_LBS_EXPECTATIONS = {
  totalFatPercent: 24.8,
  // 42.3 lbs → kg
  totalFatMassKg: Number((42.3 * 0.45359237).toFixed(4)),
  totalLeanMassKg: Number((121.9 * 0.45359237).toFixed(4)),
  totalBoneMineralContentG: Number((6.57 * 453.59237).toFixed(4)),
  totalMassKg: Number((170.9 * 0.45359237).toFixed(4)),
  visceralFatMassKg: 0.688,
  androidGynoidRatio: 0.92,
  boneMineralDensity: 1.186,
  leftArmLeanKg: Number((6.8 * 0.45359237).toFixed(4)),
  rightArmLeanKg: Number((7.0 * 0.45359237).toFixed(4)),
} as const;
