/**
 * @jest-environment jsdom
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import type { BodyScanListItemDto } from "@/lib/contracts";
import { BodyScansLandingSection } from "@/lib/ui/body-scans/BodyScansLandingSection";
import { BodyScanCategoryList } from "@/lib/ui/body-scans/BodyScanCategoryList";
import { BodyScanCategoryHistoryContent } from "@/lib/ui/body-scans/BodyScanCategoryHistoryContent";
import { BodyScanCategoryTypeChooser } from "@/lib/ui/body-scans/BodyScanCategoryTypeChooser";
import { groupBodyScansByCategory } from "@/lib/data/body-scans/groupBodyScansByCategory";
import { bodyScanCategoryDefinition } from "@/lib/data/body-scans/bodyScanCategoryCatalog";

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
  it("renders category rows and Add chooser instead of latest-scan / see-all controls", () => {
    const onPressCategory = jest.fn();
    const onPressAddWithType = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScansLandingSection
          status="ready"
          items={[scan({ id: "d1" })]}
          listComplete
          onPressCategory={onPressCategory}
          onPressAddWithType={onPressAddWithType}
        />,
      );
    });

    expect(tree!.root.findByProps({ testID: "body-scans-section-category-list" })).toBeDefined();
    expect(tree!.root.findByProps({ testID: "body-scan-category-row-dxa" })).toBeDefined();
    expect(tree!.root.findByProps({ testID: "body-scan-category-row-inbody" })).toBeDefined();
    expect(tree!.root.findAllByProps({ testID: "body-scans-section-upload" })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: "body-scans-section-see-all" })).toHaveLength(0);

    const dxaRow = tree!.root.findByProps({ testID: "body-scan-category-row-dxa" });
    expect(dxaRow.props.accessibilityRole).toBe("button");
    expect(dxaRow.props.accessibilityHint).toContain("DXA");
    expect(dxaRow.props.accessibilityLabel).toContain("DXA");

    act(() => {
      tree!.root.findByProps({ testID: "body-scans-section-add" }).props.onPress();
    });
    expect(tree!.root.findByProps({ testID: "body-scan-type-chooser" })).toBeDefined();

    act(() => {
      tree!.root.findByProps({ testID: "body-scan-type-chooser-inbody" }).props.onPress();
    });
    expect(onPressAddWithType).toHaveBeenCalledWith("inbody");

    act(() => {
      dxaRow.props.onPress();
    });
    expect(onPressCategory).toHaveBeenCalledWith("dxa");
  });

  it("shows loading card while partial and never empty-yet during load", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScansLandingSection
          status="partial"
          onPressCategory={jest.fn()}
          onPressAddWithType={jest.fn()}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "body-scans-section-loading" })).toBeDefined();
    expect(tree!.root.findAllByProps({ testID: "body-scans-section-category-list" })).toHaveLength(
      0,
    );
  });

  it("shows safe error state without PHI", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScansLandingSection
          status="error"
          onPressCategory={jest.fn()}
          onPressAddWithType={jest.fn()}
        />,
      );
    });
    const err = tree!.root.findByProps({ testID: "body-scans-section-error" });
    expect(String(err.props.children)).not.toMatch(/uid|storage|filename|\.pdf/i);
  });
});

describe("BodyScanCategoryList privacy", () => {
  it("does not render scan ids, filenames, or metric values", () => {
    const { groups } = groupBodyScansByCategory(
      [
        scan({
          id: "scan_private_id",
          deviceLabel: "GE Lunar",
        }),
      ],
      { listComplete: true },
    );
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryList groups={groups} onPressCategory={jest.fn()} />,
      );
    });
    const text = JSON.stringify(tree!.toJSON());
    expect(text).not.toContain("scan_private_id");
    expect(text).not.toMatch(/\.pdf/i);
    expect(text).not.toMatch(/Patient/i);
    expect(text).toContain("DXA");
    expect(text).toContain("No scans yet");
  });
});

describe("BodyScanCategoryHistoryContent", () => {
  it("renders empty state with category-specific add action", () => {
    const onPressAdd = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryHistoryContent
          status="ready"
          category={bodyScanCategoryDefinition("dxa")}
          items={[]}
          onPressScan={jest.fn()}
          onPressAdd={onPressAdd}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "body-scan-category-empty" })).toBeDefined();
    act(() => {
      tree!.root.findByProps({ testID: "body-scan-category-empty-add" }).props.onPress();
    });
    expect(onPressAdd).toHaveBeenCalled();
  });

  it("navigates history rows to onPressScan without exposing values", () => {
    const onPressScan = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyScanCategoryHistoryContent
          status="ready"
          category={bodyScanCategoryDefinition("dxa")}
          items={[scan({ id: "d1", status: "verified" })]}
          onPressScan={onPressScan}
          onPressAdd={jest.fn()}
        />,
      );
    });
    const row = tree!.root.findByProps({ testID: "body-scan-history-row-d1" });
    expect(row.props.accessibilityRole).toBe("button");
    expect(row.props.accessibilityLabel).toContain("Verified");
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
