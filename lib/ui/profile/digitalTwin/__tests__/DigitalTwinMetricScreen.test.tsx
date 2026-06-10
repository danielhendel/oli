import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import { DigitalTwinMetricScreen } from "@/lib/ui/profile/digitalTwin/DigitalTwinMetricScreen";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

describe("DigitalTwinMetricScreen", () => {
  it("renders the title, the coming-soon copy, and back navigation", () => {
    const onBack = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinMetricScreen title="ApoB" onBack={onBack} />);
    });

    const text = collectText(tree.root);
    expect(text).toContain("ApoB");
    expect(text).toContain("Metric detail coming soon.");

    const back = tree.root.findByProps({ testID: "dt-metric-back" });
    expect(back.props.accessibilityRole).toBe("button");
    act(() => back.props.onPress());
    expect(onBack).toHaveBeenCalled();

    act(() => tree.unmount());
  });
});
