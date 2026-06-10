import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => true }),
}));

import ProfileMetricDetailScreen from "../[metricId]";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

describe("profile/metric/[metricId] route", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
  });

  it("renders a known metric label and the coming-soon placeholder", () => {
    mockParams = { metricId: "apob" };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileMetricDetailScreen />);
    });
    const text = collectText(tree.root);
    expect(text).toContain("ApoB");
    expect(text).toContain("Metric detail coming soon.");
    act(() => tree.unmount());
  });

  it("does not crash on an invalid metricId and still shows coming soon", () => {
    mockParams = { metricId: "not-a-real-metric" };
    let tree!: renderer.ReactTestRenderer;
    expect(() => {
      act(() => {
        tree = renderer.create(<ProfileMetricDetailScreen />);
      });
    }).not.toThrow();
    expect(collectText(tree.root)).toContain("Metric detail coming soon.");
    act(() => tree.unmount());
  });

  it("does not crash when metricId is missing", () => {
    mockParams = {};
    let tree!: renderer.ReactTestRenderer;
    expect(() => {
      act(() => {
        tree = renderer.create(<ProfileMetricDetailScreen />);
      });
    }).not.toThrow();
    expect(collectText(tree.root)).toContain("Metric detail coming soon.");
    act(() => tree.unmount());
  });
});
