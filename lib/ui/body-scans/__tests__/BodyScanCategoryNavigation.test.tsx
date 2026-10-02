/**
 * @jest-environment jsdom
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyScansLandingSection } from "@/lib/ui/body-scans/BodyScansLandingSection";
import { BodyScanCategorySummaryList } from "@/lib/ui/body-scans/BodyScanCategoryList";
import { BodyScanCategoryHistoryContent } from "@/lib/ui/body-scans/BodyScanCategoryHistoryContent";
import { BodyScanCategoryTypeChooser } from "@/lib/ui/body-scans/BodyScanCategoryTypeChooser";
import { buildCategorySummaryRow } from "@/lib/data/body-scans/bodyScanCategorySummary";
import { bodyScanCategoryDefinition } from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import type { BodyScanListItemDto } from "@/lib/contracts";

function scan(partial: Partial<BodyScanListItemDto> & Pick<BodyScanListItemDto, "id">): BodyScanListItemDto {
  return {
    scanType: "dxa",
    method: "dxa",
    status: "needs_review",
    performedAt: "2026-09-27T12:00:00.000Z",
    uploadedAt: "2026-09-28T12:00:00.000Z",
    deviceLabel: "GE Lunar",
    statusLabel: "Review the extracted results before saving.",
    metricCount: 4,
    canReview: true,
    canRetry: false,
    canDelete: true,
    canViewOriginal: true,
    ...partial,
  };
}

describe("BodyScansLandingSection category navigation", () => {
  it("renders category rows and Add chooser from summary rows", () => {
    const onPressCategory = jest.fn();
    const onPressAddWithType = jest.fn();
    const rows = [
      buildCategorySummaryRow("dxa", { status: "ready", latest: scan({ id: "d1" }) }),
      buildCategorySummaryRow("inbody", { status: "ready", latest: null }),
      buildCategorySummaryRow("evolt", { status: "ready", latest: null }),
      buildCategorySummaryRow("bod_pod", { status: "ready", latest: null }),
      buildCategorySummaryRow("other", { status: "ready", latest: null }),
    ];
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScansLandingSection
          status="ready"
          rows={rows}
          onPressCategory={onPressCategory}
          onPressAddWithType={onPressAddWithType}
        />,
      );
    });

    expect(tree!.root.findByProps({ testID: "body-scans-section-category-list" })).toBeDefined();
    expect(tree!.root.findByProps({ testID: "body-scan-category-row-dxa" })).toBeDefined();
    expect(tree!.root.findByProps({ testID: "body-scan-category-row-inbody" })).toBeDefined();
    const inbodyMeta = tree!.root.findByProps({ testID: "body-scan-category-meta-inbody" });
    expect(String(inbodyMeta.props.children)).toBe("No scans yet");

    act(() => {
      tree!.root.findByProps({ testID: "body-scans-section-add" }).props.onPress();
    });
    expect(tree!.root.findByProps({ testID: "body-scan-type-chooser" })).toBeDefined();

    act(() => {
      tree!.root.findByProps({ testID: "body-scan-type-chooser-inbody" }).props.onPress();
    });
    expect(onPressAddWithType).toHaveBeenCalledWith("inbody");
  });

  it("shows loading while summaries are partial", () => {
    const rows = [
      buildCategorySummaryRow("dxa", { status: "partial" }),
      buildCategorySummaryRow("inbody", { status: "partial" }),
      buildCategorySummaryRow("evolt", { status: "partial" }),
      buildCategorySummaryRow("bod_pod", { status: "partial" }),
      buildCategorySummaryRow("other", { status: "partial" }),
    ];
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScansLandingSection
          status="partial"
          rows={rows}
          onPressCategory={jest.fn()}
          onPressAddWithType={jest.fn()}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "body-scans-section-loading" })).toBeDefined();
  });

  it("does not show No scans yet for loading or error rows", () => {
    const rows = [
      buildCategorySummaryRow("dxa", { status: "partial" }),
      buildCategorySummaryRow("inbody", { status: "error", error: "network" }),
      buildCategorySummaryRow("evolt", { status: "ready", latest: null }),
      buildCategorySummaryRow("bod_pod", { status: "ready", latest: null }),
      buildCategorySummaryRow("other", { status: "ready", latest: null }),
    ];
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategorySummaryList rows={rows} onPressCategory={jest.fn()} />,
      );
    });
    expect(String(tree!.root.findByProps({ testID: "body-scan-category-meta-dxa" }).props.children)).toBe(
      "Loading…",
    );
    expect(
      String(tree!.root.findByProps({ testID: "body-scan-category-meta-inbody" }).props.children),
    ).toBe("Unable to load");
  });
});

describe("BodyScanCategoryHistoryContent completeness", () => {
  it("renders empty only when proven empty", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryHistoryContent
          status="ready"
          category={bodyScanCategoryDefinition("dxa")}
          items={[]}
          isProvenEmpty
          onPressScan={jest.fn()}
          onPressAdd={jest.fn()}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "body-scan-category-empty" })).toBeDefined();
  });

  it("does not claim empty when items empty but not proven", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryHistoryContent
          status="ready"
          category={bodyScanCategoryDefinition("inbody")}
          items={[]}
          isProvenEmpty={false}
          hasMore
          onPressScan={jest.fn()}
          onPressAdd={jest.fn()}
        />,
      );
    });
    expect(tree!.root.findAllByProps({ testID: "body-scan-category-empty" })).toHaveLength(0);
  });

  it("navigates history rows without exposing values", () => {
    const onPressScan = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryHistoryContent
          status="ready"
          category={bodyScanCategoryDefinition("dxa")}
          items={[scan({ id: "d1", status: "verified" })]}
          isProvenEmpty={false}
          onPressScan={onPressScan}
          onPressAdd={jest.fn()}
        />,
      );
    });
    const row = tree!.root.findByProps({ testID: "body-scan-history-row-d1" });
    expect(row.props.accessibilityLabel).not.toMatch(/fat|lean|%|kg/i);
    act(() => {
      row.props.onPress();
    });
    expect(onPressScan).toHaveBeenCalledWith("d1");
  });
});

describe("BodyScanCategoryTypeChooser", () => {
  it("lists all catalog categories and supports cancel", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryTypeChooser visible onClose={onClose} onSelect={onSelect} />,
      );
    });
    for (const type of ["dxa", "inbody", "evolt", "bod_pod", "other"] as const) {
      expect(tree!.root.findByProps({ testID: `body-scan-type-chooser-${type}` })).toBeDefined();
    }
    act(() => {
      tree!.root.findByProps({ testID: "body-scan-type-chooser-cancel" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
