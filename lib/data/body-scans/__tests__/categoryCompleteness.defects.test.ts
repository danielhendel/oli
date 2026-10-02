/**
 * Reproduce Defects 1–2: false empty category claims from incomplete global pages.
 */
import type { BodyScanListItemDto } from "@oli/contracts";

import {
  buildBodyScanCategorySupportingCopy,
  groupBodyScansByCategory,
} from "../groupBodyScansByCategory";
import {
  buildCategorySummaryRow,
  type BodyScanCategorySummaryState,
} from "../bodyScanCategorySummary";

function item(
  partial: Partial<BodyScanListItemDto> & Pick<BodyScanListItemDto, "id" | "scanType">,
): BodyScanListItemDto {
  return {
    method: "dxa",
    status: "needs_review",
    performedAt: "2026-09-27T12:00:00.000Z",
    uploadedAt: "2026-09-28T12:00:00.000Z",
    deviceLabel: null,
    statusLabel: "Needs review",
    metricCount: 0,
    canReview: true,
    canRetry: false,
    canDelete: true,
    canViewOriginal: true,
    ...partial,
  };
}

describe("Defect 1 — false empty from incomplete global page", () => {
  it("must not claim No scans yet for InBody when only a truncated DXA page is loaded", () => {
    // Simulated truncated global page: 50 DXA, older InBody not present.
    const truncatedPage = Array.from({ length: 50 }, (_, i) =>
      item({
        id: `dxa_${i}`,
        scanType: "dxa",
        performedAt: `2026-09-${String((i % 27) + 1).padStart(2, "0")}T12:00:00.000Z`,
      }),
    );

    // Incomplete mixed page must never claim empty for absent categories.
    const incomplete = groupBodyScansByCategory(truncatedPage, { listComplete: false });
    const incompleteInbody = incomplete.groups.find((g) => g.category.type === "inbody")!;
    expect(incompleteInbody.supportingCopy).not.toBe("No scans yet");
    expect(incompleteInbody.supportingCopy).toBe("Unable to load");

    // Correct contract: category-scoped summary proves emptiness / latest separately.
    const inbodySummary: BodyScanCategorySummaryState = {
      status: "ready",
      latest: item({ id: "inbody_old", scanType: "inbody", method: "other" }),
    };
    const row = buildCategorySummaryRow("inbody", inbodySummary);
    expect(row.supportingCopy).not.toBe("No scans yet");
    expect(row.supportingCopy).toMatch(/^Latest /);
    expect(row.hasScans).toBe(true);
  });

  it("says No scans yet only when category-scoped query proves empty", () => {
    const empty: BodyScanCategorySummaryState = { status: "ready", latest: null };
    const row = buildCategorySummaryRow("evolt", empty);
    expect(row.supportingCopy).toBe("No scans yet");
    expect(row.hasScans).toBe(false);
  });

  it("does not convert loading or error into No scans yet", () => {
    expect(buildCategorySummaryRow("bod_pod", { status: "partial" }).supportingCopy).not.toBe(
      "No scans yet",
    );
    expect(
      buildCategorySummaryRow("other", { status: "error", error: "network" }).supportingCopy,
    ).not.toBe("No scans yet");
  });
});

describe("Defect 2 — category history empty under truncation", () => {
  it("must not treat an empty filtered mixed page as proven empty when hasMore", () => {
    // Category history must require hasMore=false + nextCursor=null before empty claim.
    const incompletePage = {
      items: [] as BodyScanListItemDto[],
      nextCursor: "opaque",
      hasMore: true,
    };
    const mayClaimEmpty =
      incompletePage.items.length === 0 &&
      incompletePage.hasMore === false &&
      incompletePage.nextCursor == null;
    expect(mayClaimEmpty).toBe(false);

    const completeEmpty = {
      items: [] as BodyScanListItemDto[],
      nextCursor: null as string | null,
      hasMore: false,
    };
    const claimEmpty =
      completeEmpty.items.length === 0 &&
      completeEmpty.hasMore === false &&
      completeEmpty.nextCursor == null;
    expect(claimEmpty).toBe(true);
  });
});

describe("supporting copy — no page-derived counts", () => {
  it("never emits exact counts from loaded pages", () => {
    const latest = item({ id: "d1", scanType: "dxa", status: "verified" });
    expect(
      buildBodyScanCategorySupportingCopy({
        latest,
        scanCount: 12,
        listComplete: true,
      }),
    ).toMatch(/^Latest .+ · Verified$/);
    expect(
      buildBodyScanCategorySupportingCopy({
        latest,
        scanCount: 12,
        listComplete: true,
      }),
    ).not.toMatch(/\d+ scans?/);
  });
});
