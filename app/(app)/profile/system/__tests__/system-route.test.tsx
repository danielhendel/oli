import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildDigitalTwinHomeVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinHomeVm";
import {
  emptyCtx,
  dailyFacts,
} from "@/lib/features/profile/digitalTwin/__fixtures__/twinFixtures";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), canGoBack: () => true }),
}));

const ctx = emptyCtx({ dailyFacts: { status: "ready", data: dailyFacts() } });
const mockHome = { vm: buildDigitalTwinHomeVm({ ctx, loading: false }), ctx, loading: false, signedOut: false, refetch: jest.fn() };

jest.mock("@/lib/features/profile/digitalTwin/useDigitalTwinHome", () => ({
  useDigitalTwinHome: () => mockHome,
}));

import ProfileSystemDetailScreen from "../[systemId]";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

describe("profile/system/[systemId] route", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
  });

  it("renders the system and navigates rows on press", () => {
    mockParams = { systemId: "cardiovascular" };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileSystemDetailScreen />);
    });
    expect(collectText(tree.root)).toContain("Cardiovascular");
    const row = tree.root.findByProps({ testID: "dt-metric-row-apob" });
    act(() => row.props.onPress());
    expect(mockPush).toHaveBeenCalledWith("/(app)/profile/metric/apob");
    act(() => tree.unmount());
  });

  it("does not crash on an invalid systemId and shows not-found", () => {
    mockParams = { systemId: "not-a-real-system" };
    let tree!: renderer.ReactTestRenderer;
    expect(() => {
      act(() => {
        tree = renderer.create(<ProfileSystemDetailScreen />);
      });
    }).not.toThrow();
    expect(collectText(tree.root)).toContain("System not found");
    act(() => tree.unmount());
  });
});
