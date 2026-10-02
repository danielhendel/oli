/**
 * Body Scan category catalog contracts.
 */
import {
  BODY_SCAN_CATEGORY_DEFINITIONS,
  BODY_SCAN_CATEGORY_TYPES,
  bodyScanCategoryAssociatedMethod,
  bodyScanCategoryDefinition,
  bodyScanCategoryLabel,
  isBodyScanCategoryType,
} from "../bodyScanCategoryCatalog";

describe("bodyScanCategoryCatalog", () => {
  it("exposes exactly five categories in fixed product order", () => {
    expect(BODY_SCAN_CATEGORY_TYPES).toEqual([
      "dxa",
      "inbody",
      "evolt",
      "bod_pod",
      "other",
    ]);
    expect(BODY_SCAN_CATEGORY_DEFINITIONS.map((d) => d.sortOrder)).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses DXA (not DEXA) and exact InBody capitalization", () => {
    expect(bodyScanCategoryLabel("dxa")).toBe("DXA");
    expect(bodyScanCategoryLabel("inbody")).toBe("InBody");
    expect(bodyScanCategoryDefinition("dxa").historyTitle).toBe("DXA Scans");
    expect(bodyScanCategoryDefinition("inbody").historyTitle).toBe("InBody Scans");
    for (const def of BODY_SCAN_CATEGORY_DEFINITIONS) {
      expect(def.label.toLowerCase()).not.toContain("dexa");
      expect(def.historyTitle.toLowerCase()).not.toContain("dexa");
    }
  });

  it("keeps category vs scientific method boundary", () => {
    expect(bodyScanCategoryAssociatedMethod("dxa")).toBe("dxa");
    expect(bodyScanCategoryAssociatedMethod("inbody")).toBe("bia");
    expect(bodyScanCategoryAssociatedMethod("evolt")).toBe("bia");
    expect(bodyScanCategoryAssociatedMethod("bod_pod")).toBe("air_displacement");
    expect(bodyScanCategoryAssociatedMethod("other")).toBe("other");
    // Categories must never collapse brand → method string.
    expect(bodyScanCategoryAssociatedMethod("inbody")).not.toBe("inbody");
    expect(bodyScanCategoryAssociatedMethod("evolt")).not.toBe("evolt");
  });

  it("validates governed types and rejects arbitrary strings", () => {
    expect(isBodyScanCategoryType("dxa")).toBe(true);
    expect(isBodyScanCategoryType("bod_pod")).toBe(true);
    expect(isBodyScanCategoryType("not-a-type")).toBe(false);
    expect(isBodyScanCategoryType("dexa")).toBe(false);
  });

  it("provides category-specific empty and add copy without promising extraction", () => {
    for (const def of BODY_SCAN_CATEGORY_DEFINITIONS) {
      expect(def.emptyTitle.length).toBeGreaterThan(0);
      expect(def.emptyBody.length).toBeGreaterThan(0);
      expect(def.addLabel).toMatch(/^Add /);
      expect(def.emptyBody.toLowerCase()).not.toMatch(/automatic extraction|will extract/);
      expect(def.accessibilityHint.toLowerCase()).toContain("opens");
    }
  });
});
