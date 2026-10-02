import type { BodyScanListItemDto } from "@oli/contracts";

import {
  bodyScanHistoryDateLabel,
  buildBodyScanCategorySupportingCopy,
  groupBodyScansByCategory,
  mergeBodyScanHistoryPages,
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

  it("never emits page-derived counts", () => {
    const { groups } = groupBodyScansByCategory([item({ id: "d1", scanType: "dxa" })], {
      listComplete: true,
    });
    expect(groups.every((g) => g.scanCount === null)).toBe(true);
    expect(groups.find((g) => g.category.type === "dxa")!.supportingCopy).toMatch(/^Latest /);
    expect(groups.find((g) => g.category.type === "dxa")!.supportingCopy).not.toMatch(/\d+ scans?/);
  });

  it("does not claim empty for missing categories when list is incomplete", () => {
    const truncated = Array.from({ length: 50 }, (_, i) =>
      item({ id: `d${i}`, scanType: "dxa" }),
    );
    const { groups } = groupBodyScansByCategory(truncated, { listComplete: false });
    const inbody = groups.find((g) => g.category.type === "inbody")!;
    expect(inbody.supportingCopy).not.toBe("No scans yet");
    expect(inbody.supportingCopy).toBe("Unable to load");
  });

  it("claims No scans yet only when listComplete and category absent", () => {
    const { groups } = groupBodyScansByCategory([item({ id: "d1", scanType: "dxa" })], {
      listComplete: true,
    });
    expect(groups.find((g) => g.category.type === "inbody")!.supportingCopy).toBe("No scans yet");
  });
});

describe("selectBodyScansForCategory / merge / date labels", () => {
  it("filters and sorts newest first preferring performedAt", () => {
    const items = [
      item({ id: "old", scanType: "inbody", performedAt: "2025-01-01T00:00:00.000Z" }),
      item({ id: "new", scanType: "inbody", performedAt: "2026-09-27T00:00:00.000Z" }),
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

  it("merges pages by scan id without duplicates", () => {
    const merged = mergeBodyScanHistoryPages([
      [item({ id: "a", scanType: "dxa" }), item({ id: "b", scanType: "dxa" })],
      [item({ id: "b", scanType: "dxa" }), item({ id: "c", scanType: "dxa" })],
    ]);
    expect(merged.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("labels upload date honestly when performedAt is missing", () => {
    const uploadOnly = item({
      id: "u1",
      scanType: "other",
      performedAt: null,
      uploadedAt: "2026-09-27T12:00:00.000Z",
    });
    expect(bodyScanHistoryDateLabel(uploadOnly)).toMatch(/^Uploaded /);
  });
});

describe("buildBodyScanCategorySupportingCopy", () => {
  it("uses Latest · status without counts", () => {
    const latest = item({ id: "d1", scanType: "dxa", status: "verified" });
    expect(
      buildBodyScanCategorySupportingCopy({
        latest,
        scanCount: 99,
        listComplete: true,
      }),
    ).toMatch(/^Latest .+ · Verified$/);
  });
});
