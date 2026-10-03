/**
 * @jest-environment jsdom
 *
 * Scroll containment: category history FlatList must not nest in ModuleScreenShell ScrollView.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { FlatList, ScrollView, Text } from "react-native";

import { BodyScanCategoryHistoryContent } from "@/lib/ui/body-scans/BodyScanCategoryHistoryContent";
import { bodyScanCategoryDefinition } from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import type { BodyScanListItemDto } from "@/lib/contracts";

function scan(id: string): BodyScanListItemDto {
  return {
    id,
    scanType: "dxa",
    method: "dxa",
    status: "needs_review",
    performedAt: "2026-09-27T12:00:00.000Z",
    uploadedAt: "2026-09-28T12:00:00.000Z",
    deviceLabel: "GE Lunar",
    statusLabel: "Needs review",
    metricCount: 2,
    canReview: true,
    canRetry: false,
    canDelete: true,
    canViewOriginal: true,
  };
}

function parentTypes(node: renderer.ReactTestInstance): unknown[] {
  const types: unknown[] = [];
  let current: renderer.ReactTestInstance | null = node.parent;
  while (current) {
    types.push(current.type);
    current = current.parent;
  }
  return types;
}

describe("Body Scan category history scroll ownership", () => {
  const category = bodyScanCategoryDefinition("dxa");

  it("uses one root FlatList inside non-scroll shell (FlatList not under ScrollView)", () => {
    let tree!: renderer.ReactTestRenderer;
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    act(() => {
      tree = renderer.create(
        <ModuleScreenShell title="DXA Scans" hideTitleChrome bodyScrollEnabled={false}>
          <BodyScanCategoryHistoryContent
            status="ready"
            category={category}
            items={[scan("d1"), scan("d2")]}
            isProvenEmpty={false}
            hasMore={false}
            onPressScan={jest.fn()}
            onPressAdd={jest.fn()}
          />
        </ModuleScreenShell>,
      );
    });

    const lists = tree.root.findAllByType(FlatList);
    expect(lists).toHaveLength(1);
    expect(parentTypes(lists[0])).not.toContain(ScrollView);
    expect(
      errSpy.mock.calls.some((args) =>
        String(args[0] ?? "").includes("VirtualizedLists should never be nested"),
      ),
    ).toBe(false);
    errSpy.mockRestore();
  });

  it("non-scroll shell with plain children has zero ScrollView", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ModuleScreenShell title="DXA Scans" hideTitleChrome bodyScrollEnabled={false}>
          <Text>placeholder</Text>
        </ModuleScreenShell>,
      );
    });
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
  });

  it("documents defect: FlatList under shell ScrollView when bodyScrollEnabled stays true", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ModuleScreenShell title="DXA Scans" hideTitleChrome bodyScrollEnabled={true}>
          <BodyScanCategoryHistoryContent
            status="ready"
            category={category}
            items={[scan("d1")]}
            isProvenEmpty={false}
            hasMore={false}
            onPressScan={jest.fn()}
            onPressAdd={jest.fn()}
          />
        </ModuleScreenShell>,
      );
    });
    const list = tree.root.findByType(FlatList);
    expect(parentTypes(list)).toContain(ScrollView);
  });
});
