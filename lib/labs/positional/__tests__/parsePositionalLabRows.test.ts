/**
 * Structural tests for positional PDF helpers and Quest panel profiles.
 */
import { describe, expect, it } from "@jest/globals";
import { groupPdfTextItemsIntoRows, type PdfTextItem } from "../pdfTextItem";
import { getQuestPanelProfile, QUEST_PANEL_PROFILES } from "../questPanelProfiles";
import { parsePositionalLabRows } from "../parsePositionalLabRows";

function item(
  text: string,
  page: number,
  x: number,
  y: number,
  width = 20,
  height = 8,
): PdfTextItem {
  return { text, page, x, y, width, height };
}

describe("quest panel profiles", () => {
  it("registers required Quest panel profiles", () => {
    const ids = QUEST_PANEL_PROFILES.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "quest_cmp_v1",
        "quest_cbc_v1",
        "quest_lipid_v1",
        "quest_thyroid_v1",
        "quest_hormone_v1",
        "quest_cardio_iq_v1",
        "quest_advanced_lipid_v1",
      ]),
    );
  });

  it("resolves Cardio IQ profile", () => {
    expect(getQuestPanelProfile("CARDIO IQ LIPID PANEL")?.id).toBe("quest_cardio_iq_v1");
  });
});

describe("groupPdfTextItemsIntoRows", () => {
  it("groups by y proximity and sorts by x", () => {
    const rows = groupPdfTextItemsIntoRows([
      item("B", 1, 40, 100),
      item("A", 1, 10, 100),
      item("C", 1, 10, 50),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.map((r) => r.text)).toEqual(["A", "B"]);
    expect(rows[1]!.map((r) => r.text)).toEqual(["C"]);
  });
});

describe("parsePositionalLabRows", () => {
  it("realigns HbA1c unit when Hgb is adjacent and range has percent", () => {
    // Relative x positions map into standard Quest column bands for page width ~100.
    const items: PdfTextItem[] = [
      item("HEMOGLOBIN A1c", 1, 5, 200, 30),
      item("5.6", 1, 42, 200, 8),
      item("Hgb", 1, 62, 200, 8),
      item("<5.7 % of total", 1, 80, 200, 20),
    ];
    const rows = parsePositionalLabRows({ items, panelLabel: "METABOLIC" });
    const a1c = rows.find((r) => r.canonicalMetricId === "hba1c");
    expect(a1c).toBeTruthy();
    expect(a1c?.rawUnit).toBe("%");
    expect(a1c?.result).toEqual({ kind: "numeric", value: 5.6, comparator: "eq" });
  });

  it("skips known header rows", () => {
    const items: PdfTextItem[] = [
      item("TEST NAME", 1, 5, 300, 30),
      item("RESULT", 1, 42, 300, 10),
      item("UNITS", 1, 62, 300, 10),
    ];
    expect(parsePositionalLabRows({ items, panelLabel: "CBC" })).toHaveLength(0);
  });

  it("preserves inequality comparator from positional result column", () => {
    const items: PdfTextItem[] = [
      item("Lp(a)", 1, 5, 180, 20),
      item("<4", 1, 42, 180, 8),
      item("nmol/L", 1, 62, 180, 12),
      item("<75", 1, 80, 180, 10),
    ];
    const rows = parsePositionalLabRows({ items, panelLabel: "LIPID PANEL" });
    const row = rows.find((r) => r.canonicalMetricId === "lpa");
    expect(row?.result).toEqual({ kind: "numeric", value: 4, comparator: "lt" });
  });
});
