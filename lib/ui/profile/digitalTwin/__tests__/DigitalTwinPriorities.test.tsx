import React from "react";
import renderer, { act } from "react-test-renderer";

import { DigitalTwinPriorities } from "@/lib/ui/profile/digitalTwin/DigitalTwinPriorities";
import type { PrioritiesVm } from "@/lib/features/profile/digitalTwin/types";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

const grouped: PrioritiesVm = {
  isEmpty: false,
  emptyCopy: "Nothing needs attention today.",
  groups: [
    {
      key: "attention",
      title: "Attention",
      rows: [
        {
          id: "r1",
          group: "attention",
          label: "Recovery is below your usual range",
          detail: null,
          href: "/(app)/profile/system/sleep-recovery",
          accessibilityLabel: "Recovery is below your usual range",
        },
      ],
    },
  ],
};

const empty: PrioritiesVm = {
  isEmpty: true,
  emptyCopy: "Nothing needs attention today.",
  groups: [],
};

describe("DigitalTwinPriorities", () => {
  it("renders grouped rows and navigates on press", () => {
    const onPressRow = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinPriorities priorities={grouped} onPressRow={onPressRow} />);
    });
    expect(collectText(tree.root)).toContain("Attention");
    const row = tree.root.findByProps({ testID: "dt-priority-row-r1" });
    act(() => row.props.onPress());
    expect(onPressRow).toHaveBeenCalledWith("/(app)/profile/system/sleep-recovery");
    expect(row.props.accessibilityLabel).toContain("Recovery is below");
    act(() => tree.unmount());
  });

  it("shows the clean empty copy when there are no priorities", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinPriorities priorities={empty} onPressRow={jest.fn()} />);
    });
    expect(collectText(tree.root)).toContain("Nothing needs attention today.");
    act(() => tree.unmount());
  });
});
