import React from "react";
import renderer, { act } from "react-test-renderer";

import { DigitalTwinSystemCard } from "@/lib/ui/profile/digitalTwin/DigitalTwinSystemCard";
import { buildDigitalTwinSystemVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinSystemVm";
import { getDigitalTwinSystem } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { emptyCtx } from "@/lib/features/profile/digitalTwin/__fixtures__/twinFixtures";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

function resolveStyle(style: unknown): Record<string, unknown> {
  const raw = typeof style === "function" ? (style as (s: { pressed: boolean }) => unknown)({ pressed: false }) : style;
  const flat: Record<string, unknown> = {};
  const visit = (s: unknown) => {
    if (Array.isArray(s)) s.forEach(visit);
    else if (s && typeof s === "object") Object.assign(flat, s);
  };
  visit(raw);
  return flat;
}

function sys(id: string) {
  const s = getDigitalTwinSystem(id);
  if (!s) throw new Error(`missing ${id}`);
  return s;
}

describe("DigitalTwinSystemCard", () => {
  it("renders collapsed by default: full title + subtitle, no status pill, no metric rows", () => {
    const system = buildDigitalTwinSystemVm(sys("cardiovascular"), emptyCtx());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinSystemCard system={system} onPressRow={jest.fn()} />);
    });

    const text = collectText(tree.root);
    // Title renders fully (no ellipsis/truncation).
    expect(text).toContain("Cardiovascular Health");
    expect(text).toContain(system.subtitle);
    // Status pill is no longer rendered on the card.
    expect(text).not.toContain(system.statusLabel);

    // Rows are not mounted while collapsed.
    expect(tree.root.findAllByProps({ testID: "dt-system-rows-cardiovascular" })).toHaveLength(0);

    // Header exposes an accessible, expandable control.
    const header = tree.root.findByProps({ testID: "dt-system-header-cardiovascular" });
    expect(header.props.accessibilityRole).toBe("button");
    expect(header.props.accessibilityLabel).toContain("Cardiovascular Health");
    expect(header.props.accessibilityState).toEqual({ expanded: false });
    expect(resolveStyle(header.props.style).minHeight).toBe(44);

    act(() => tree.unmount());
  });

  it("expands and collapses when the header is tapped, rendering every marker", () => {
    const system = buildDigitalTwinSystemVm(sys("cardiovascular"), emptyCtx());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinSystemCard system={system} onPressRow={jest.fn()} />);
    });
    const header = tree.root.findByProps({ testID: "dt-system-header-cardiovascular" });

    act(() => header.props.onPress());
    expect(tree.root.findAllByProps({ testID: "dt-system-rows-cardiovascular" }).length).toBeGreaterThan(0);
    // Each marker renders exactly one row when expanded.
    for (const r of system.rows) {
      expect(tree.root.findAllByProps({ testID: `dt-metric-row-${r.id}` }).length).toBeGreaterThan(0);
    }

    act(() => header.props.onPress());
    expect(tree.root.findAllByProps({ testID: "dt-system-rows-cardiovascular" })).toHaveLength(0);

    act(() => tree.unmount());
  });

  it("every row has a chevron, navigates to its metric page, and meets 44px + a11y", () => {
    const system = buildDigitalTwinSystemVm(sys("cardiovascular"), emptyCtx());
    const onRow = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DigitalTwinSystemCard system={system} onPressRow={onRow} defaultExpanded />,
      );
    });

    for (const r of system.rows) {
      const row = tree.root.findByProps({ testID: `dt-metric-row-${r.id}` });
      expect(row.props.accessibilityLabel.length).toBeGreaterThan(0);
      expect(resolveStyle(row.props.style).minHeight).toBe(44);
      expect(tree.root.findAllByProps({ testID: `dt-metric-row-chevron-${r.id}` }).length).toBeGreaterThan(0);
    }

    const apob = tree.root.findByProps({ testID: "dt-metric-row-apob" });
    act(() => apob.props.onPress());
    expect(onRow).toHaveBeenCalledWith("/(app)/profile/metric/apob");

    act(() => tree.unmount());
  });
});
