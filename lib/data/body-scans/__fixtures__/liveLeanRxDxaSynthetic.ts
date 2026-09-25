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
