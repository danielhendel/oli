import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ metricKey: "ldl_c" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

const mockDetail = {
  status: "ready" as const,
  data: {
    ok: true as const,
    metricKey: "ldl_c",
    displayName: "LDL-C",
    categoryKey: "cardiovascular",
    preferredUnit: "mg/dL",
    referenceRangeText: "0–100 mg/dL",
    latest: {
      schemaVersion: 2 as const,
      id: "r1",
      uploadId: "up1",
      metricKey: "ldl_c",
      displayName: "LDL-C",
      categoryKey: "cardiovascular",
      value: 92,
      unit: "mg/dL",
      flag: "normal" as const,
      collectedAt: "2025-06-01T00:00:00.000Z",
      source: "lab_pdf" as const,
      confidence: 0.9,
      rawName: "LDL-C",
      createdAt: "2025-06-01T00:00:00.000Z",
    },
    history: [],
  },
  refetch: jest.fn(),
};

jest.mock("@/lib/data/labs/useLabMetricDetail", () => ({
  useLabMetricDetail: () => mockDetail,
}));

import LabMetricDetailScreen from "../metric/[metricKey]";

describe("LabMetricDetailScreen", () => {
  it("renders latest result and provenance", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabMetricDetailScreen />);
    });

    const root = tree!.root;
    expect(root.findByProps({ testID: "lab-metric-detail" })).toBeTruthy();
    expect(root.findByProps({ testID: "lab-metric-latest-value" }).props.children).toContain("92");
    const text = root.findAllByType(require("react-native").Text).map((t) => t.props.children).join(" ");
    expect(text).toContain("Source");
    expect(text).toContain("lab PDF");
  });
});
