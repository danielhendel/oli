import type { BodyScanListItemDto } from "@oli/contracts";

import {
  BODY_SCAN_LIST_PAGE_MAX,
  bodyScanHistoryDateLabel,
  buildBodyScanCategorySupportingCopy,
  groupBodyScansByCategory,
  selectBodyScansForCategory,
} from "../groupBodyScansByCategory";
import { bodyScanCategoryAssociatedMethod } from "../bodyScanCategoryCatalog";

function item(
  partial: Partial<BodyScanListItemDto> & Pick<BodyScanListItemDto, "id" | "scanType">,
): BodyScanListItemDto {
  return {
    method: bodyScanCategoryAssociatedMethod(partial.scanType),
    status: "needs_review",
    performedAt: "2026-09-27T12:00:00.000Z",
    uploadedAt: "2026-09-28T12:00:00.000Z",
    deviceLabel: null,
    statusLabel: "Review the extracted results before saving.",
    metricCount: 0,
    canReview: true,
    canRetry: false,
    canDelete: true,
    canViewOriginal: true,
    ...partial,
  };
}

describe("groupBodyScansByCategory", () => {
  it("keeps fixed category order regardless of input shuffle", () => {
    const shuffled = [
      item({ id: "e1", scanType: "evolt", performedAt: "2026-01-01T00:00:00.000Z" }),
      item({ id: "d1", scanType: "dxa", performedAt: "2026-09-27T00:00:00.000Z" }),
      item({ id: "o1", scanType: "other", performedAt: "2026-02-01T00:00:00.000Z" }),
      item({ id: "i1", scanType: "inbody", performedAt: "2026-03-01T00:00:00.000Z" }),
      item({ id: "b1", scanType: "bod_pod", performedAt: "2026-04-01T00:00:00.000Z" }),
    ];
    const { groups } = groupBodyScansByCategory(shuffled, { listComplete: true });
    expect(groups.map((g) => g.category.type)).toEqual([
      "dxa",
      "inbody",
      "evolt",
      "bod_pod",
      "other",
    ]);
  });

  it("places each scan in exactly one category", () => {
    const items = [
      item({ id: "d1", scanType: "dxa" }),
      item({ id: "i1", scanType: "inbody" }),
      item({ id: "d1-dup", scanType: "dxa" }),
    ];
    // Same id twice must only count once.
    const withDup = [...items, item({ id: "d1", scanType: "dxa" })];
    const { groups } = groupBodyScansByCategory(withDup, { listComplete: true });
    const total = groups.reduce((sum, g) => sum + (g.scanCount ?? 0), 0);
    expect(total).toBe(3);
  });

  it("selects latest scan deterministically by performedAt then id", () => {
    const items = [
      item({ id: "a", scanType: "dxa", performedAt: "2026-01-01T00:00:00.000Z" }),
      item({ id: "b", scanType: "dxa", performedAt: "2026-09-27T00:00:00.000Z" }),
      item({ id: "c", scanType: "dxa", performedAt: "2026-09-27T00:00:00.000Z" }),
    ];
    const { groups } = groupBodyScansByCategory(items, { listComplete: true });
    const dxa = groups.find((g) => g.category.type === "dxa")!;
    // Same performedAt → higher id sorts first lexicographically when reversed? 
    // sort key is performedAt\0id, newest first means larger key first.
    // "2026-09-27...\0c" > "2026-09-27...\0b" so c wins.
    expect(dxa.latest?.id).toBe("c");
  });

  it("marks empty categories and omits counts when list is incomplete", () => {
    const items = [item({ id: "d1", scanType: "dxa" })];
    const incomplete = groupBodyScansByCategory(items, { listComplete: false });
    const dxa = incomplete.groups.find((g) => g.category.type === "dxa")!;
    const inbody = incomplete.groups.find((g) => g.category.type === "inbody")!;
    expect(dxa.scanCount).toBeNull();
    expect(dxa.supportingCopy).toMatch(/^Latest /);
    expect(dxa.supportingCopy).toContain("Needs review");
    expect(inbody.supportingCopy).toBe("No scans yet");
    expect(inbody.hasScans).toBe(false);

    const complete = groupBodyScansByCategory(items, { listComplete: true });
    expect(complete.groups.find((g) => g.category.type === "dxa")!.scanCount).toBe(1);
    expect(complete.groups.find((g) => g.category.type === "dxa")!.supportingCopy).toMatch(
      /^1 scan · Latest /,
    );
  });

  it("treats list as complete only when below page max by default", () => {
    const many = Array.from({ length: BODY_SCAN_LIST_PAGE_MAX }, (_, i) =>
      item({ id: `s${i}`, scanType: "dxa", performedAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z` }),
    );
    const result = groupBodyScansByCategory(many);
    expect(result.listComplete).toBe(false);
    expect(result.groups[0]!.scanCount).toBeNull();
  });

  it("never exposes values, filenames, or ids in supporting copy", () => {
    const items = [
      item({
        id: "secret-scan-id",
        scanType: "dxa",
        deviceLabel: "GE Lunar",
        metricCount: 12,
      }),
    ];
    const { groups } = groupBodyScansByCategory(items, { listComplete: true });
    const copy = groups.map((g) => `${g.supportingCopy}|${g.accessibilityLabel}`).join("\n");
    expect(copy).not.toContain("secret-scan-id");
    expect(copy).not.toMatch(/\.pdf/i);
    expect(copy).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(copy).not.toMatch(/fat|lean|kg|lb/i);
  });

  it("builds accessibility labels for empty and populated rows", () => {
    const { groups } = groupBodyScansByCategory(
      [item({ id: "d1", scanType: "dxa" })],
      { listComplete: true },
    );
    const dxa = groups.find((g) => g.category.type === "dxa")!;
    const inbody = groups.find((g) => g.category.type === "inbody")!;
    expect(dxa.accessibilityLabel).toContain("DXA");
    expect(dxa.accessibilityLabel).toContain("One scan");
    expect(dxa.accessibilityLabel).toContain("Needs review");
    expect(inbody.accessibilityLabel).toBe("InBody. No scans yet.");
  });
});

describe("selectBodyScansForCategory / date labels", () => {
  it("filters and sorts newest first preferring performedAt", () => {
    const items = [
      item({
        id: "old",
        scanType: "inbody",
        performedAt: "2025-01-01T00:00:00.000Z",
      }),
      item({
        id: "new",
        scanType: "inbody",
        performedAt: "2026-09-27T00:00:00.000Z",
      }),
      item({ id: "dxa", scanType: "dxa" }),
      item({
        id: "upload-only",
        scanType: "inbody",
        performedAt: null,
        uploadedAt: "2026-08-01T00:00:00.000Z",
      }),
    ];
    const history = selectBodyScansForCategory(items, "inbody");
    expect(history.map((h) => h.id)).toEqual(["new", "upload-only", "old"]);
  });

  it("labels upload date honestly when performedAt is missing", () => {
    const uploadOnly = item({
      id: "u1",
      scanType: "other",
      performedAt: null,
      uploadedAt: "2026-09-27T12:00:00.000Z",
    });
    expect(bodyScanHistoryDateLabel(uploadOnly)).toMatch(/^Uploaded /);
    const measured = item({ id: "m1", scanType: "dxa" });
    expect(bodyScanHistoryDateLabel(measured)).not.toMatch(/^Uploaded /);
  });
});

describe("buildBodyScanCategorySupportingCopy", () => {
  it("uses the consistent incomplete pattern without counts", () => {
    const latest = item({ id: "d1", scanType: "dxa", status: "verified" });
    expect(
      buildBodyScanCategorySupportingCopy({
        latest,
        scanCount: null,
        listComplete: false,
      }),
    ).toMatch(/^Latest .+ · Verified$/);
  });
});
