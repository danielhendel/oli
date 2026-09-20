import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyMetricDetailHeaderLeft } from "@/lib/ui/headers/useBodyMetricDetailHeader";

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: (props: {
    accessibilityLabel?: string;
    testID?: string;
    style?: unknown;
  }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("Pressable", {
      testID: props.testID ?? "back",
      accessibilityLabel: props.accessibilityLabel,
      style: props.style,
    });
  },
}));

describe("BodyMetricDetailHeaderLeft", () => {
  it("renders back then title in a left-aligned cluster", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricDetailHeaderLeft title="Weight" onBack={jest.fn()} />,
      );
    });
    const cluster = tree.root.findByProps({ testID: "body-metric-detail-header-left" });
    expect(cluster.props.style.flexDirection).toBe("row");
    const back = tree.root.findByProps({ testID: "body-metric-detail-header-back" });
    expect(back.props.accessibilityLabel).toBe("Back to Body Composition");
    const title = tree.root.findByProps({ testID: "body-metric-detail-header-title" });
    expect(title.props.children).toBe("Weight");
    expect(title.props.accessibilityRole).toBe("header");
  });
});
