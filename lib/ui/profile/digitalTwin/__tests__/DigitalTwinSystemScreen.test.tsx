import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import { DigitalTwinSystemScreen } from "@/lib/ui/profile/digitalTwin/DigitalTwinSystemScreen";
import { buildDigitalTwinSystemVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinSystemVm";
import { getDigitalTwinSystem } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import {
  emptyCtx,
  dailyFacts,
} from "@/lib/features/profile/digitalTwin/__fixtures__/twinFixtures";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

describe("DigitalTwinSystemScreen", () => {
  it("renders title and marker rows that navigate to the metric page", () => {
    const ctx = emptyCtx({ dailyFacts: { status: "ready", data: dailyFacts() } });
    const system = buildDigitalTwinSystemVm(getDigitalTwinSystem("cardiovascular")!, ctx);
    const onRow = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DigitalTwinSystemScreen
          system={system}
          loading={false}
          signedOut={false}
          updatedLabel="Jun 9"
          onPressRow={onRow}
          onPressCta={jest.fn()}
          onBack={jest.fn()}
        />,
      );
    });
    const text = collectText(tree.root);
    expect(text).toContain("Cardiovascular");
    const row = tree.root.findByProps({ testID: "dt-metric-row-apob" });
    act(() => row.props.onPress());
    expect(onRow).toHaveBeenCalledWith("/(app)/profile/metric/apob");
    act(() => tree.unmount());
  });

  it("shows a friendly not-found state with back navigation for an invalid system", () => {
    const onBack = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DigitalTwinSystemScreen
          system={null}
          loading={false}
          signedOut={false}
          updatedLabel={null}
          onPressRow={jest.fn()}
          onPressCta={jest.fn()}
          onBack={onBack}
        />,
      );
    });
    expect(collectText(tree.root)).toContain("System not found");
    const back = tree.root.findByProps({ testID: "dt-system-back" });
    act(() => back.props.onPress());
    expect(onBack).toHaveBeenCalled();
    act(() => tree.unmount());
  });

  it("renders a data-needed state for a needs-data system", () => {
    const system = buildDigitalTwinSystemVm(getDigitalTwinSystem("hormones-thyroid")!, emptyCtx());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DigitalTwinSystemScreen
          system={system}
          loading={false}
          signedOut={false}
          updatedLabel={null}
          onPressRow={jest.fn()}
          onPressCta={jest.fn()}
          onBack={jest.fn()}
        />,
      );
    });
    expect(collectText(tree.root)).toContain("Needs Data");
    act(() => tree.unmount());
  });
});
