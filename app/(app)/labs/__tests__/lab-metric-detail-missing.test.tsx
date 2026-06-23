import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ metricKey: "ldl_c" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/data/labs/useLabMetricDetail", () => ({
  useLabMetricDetail: () => ({
    status: "ready",
    data: {
      ok: true,
      metricKey: "ldl_c",
      displayName: "LDL-C",
      categoryKey: "cardiovascular",
      preferredUnit: "mg/dL",
      latest: null,
      history: [],
      referenceRangeText: null,
    },
    refetch: jest.fn(),
  }),
}));

import LabMetricDetailScreen from "../metric/[metricKey]";

describe("LabMetricDetailScreen missing value", () => {
  it("handles missing value with em dash", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabMetricDetailScreen />);
    });

    expect(tree!.root.findByProps({ testID: "lab-metric-latest-value" }).props.children).toBe("—");
  });
});
