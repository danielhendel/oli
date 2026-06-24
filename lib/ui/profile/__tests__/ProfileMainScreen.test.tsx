import React from "react";
import renderer, { act } from "react-test-renderer";
import { ScrollView, View } from "react-native";

import { defaultUserProfileMain } from "@oli/contracts";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import { ProfileMainScreen } from "../ProfileMainScreen";
import { buildDigitalTwinHomeVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinHomeVm";
import { DIGITAL_TWIN_SYSTEMS, getDigitalTwinSystem } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { emptyCtx } from "@/lib/features/profile/digitalTwin/__fixtures__/twinFixtures";

const TWIN = buildDigitalTwinHomeVm({ ctx: emptyCtx(), loading: false });

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  const visit = (s: unknown) => {
    if (Array.isArray(s)) s.forEach(visit);
    else if (s && typeof s === "object") Object.assign(flat, s);
  };
  visit(style);
  return flat;
}

function render() {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ProfileMainScreen
        profile={defaultUserProfileMain()}
        status="ready"
        massUnit="lb"
        twin={TWIN}
        healthAssessmentHref="/(app)/profile/health-assessment"
        healthAssessmentHasProgress={false}
        healthAssessmentCompletionPercent={0}
        healthBaselineHref="/(app)/profile/health-baseline"
        healthBaselineCompleteness={null}
        healthBaselineConfidence={null}
        targetStateHref="/(app)/profile/target-state"
        targetStateCoverage={null}
        targetStateConfidence={null}
      />,
    );
  });
  return tree;
}

describe("ProfileMainScreen (Health & Fitness Data home)", () => {
  beforeEach(() => mockPush.mockClear());

  it("renders the Health & Fitness Data title (no subtitle) and drops Overview / Priorities / Systems / Identity", () => {
    const tree = render();
    const text = collectText(tree.root);

    expect(text).toContain("Health & Fitness Data");
    // Subtitle copy is removed.
    expect(text).not.toContain("A live model of your health");
    // Removed sections / headings.
    expect(text).not.toContain("Digital Twin");
    expect(text).not.toContain("Systems");
    expect(text).not.toContain("Identity");
    // Overview + Priorities cards are not mounted.
    expect(tree.root.findAllByProps({ testID: "dt-overview-card" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "dt-priorities" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "dt-priorities-empty" })).toHaveLength(0);

    act(() => tree.unmount());
  });

  it("renders the title inside the scroll content so it scrolls away (no fixed header)", () => {
    const tree = render();
    const scroll = tree.root.findByType(ScrollView);
    // Title lives within the ScrollView subtree, not as a pinned header outside it.
    expect(collectText(scroll)).toContain("Health & Fitness Data");
    act(() => tree.unmount());
  });

  it("renders the General card first, then all 13 health cards, all collapsed by default", () => {
    const tree = render();

    // General is the first system, followed by the 13 health systems.
    expect(DIGITAL_TWIN_SYSTEMS[0]?.id).toBe("general");
    expect(DIGITAL_TWIN_SYSTEMS).toHaveLength(14);

    const text = collectText(tree.root);
    expect(text).toContain("General");
    expect(text).toContain("Profile and lifestyle basics.");

    for (const s of DIGITAL_TWIN_SYSTEMS) {
      expect(tree.root.findAllByProps({ testID: `dt-system-card-${s.id}` }).length).toBeGreaterThan(0);
      // Collapsed: rows are not mounted yet.
      expect(tree.root.findAllByProps({ testID: `dt-system-rows-${s.id}` })).toHaveLength(0);
    }

    act(() => tree.unmount());
  });

  it("expands the General card and navigates its rows to the profile metric fallback route", () => {
    const tree = render();
    const header = tree.root.findByProps({ testID: "dt-system-header-general" });

    act(() => header.props.onPress());

    const general = getDigitalTwinSystem("general")!;
    expect(general.metrics.length).toBe(9);
    for (const m of general.metrics) {
      expect(tree.root.findAllByProps({ testID: `dt-metric-row-${m.id}` }).length).toBeGreaterThan(0);
    }

    const firstName = tree.root.findByProps({ testID: "dt-metric-row-first-name" });
    act(() => firstName.props.onPress());
    expect(mockPush).toHaveBeenCalledWith("/(app)/profile/metric/first-name");

    act(() => tree.unmount());
  });

  it("uses Dash-matching horizontal spacing for the card content", () => {
    const tree = render();
    // The card content container applies the shared tab-root inset (matches Dash card width).
    const insetViews = tree.root
      .findAllByType(View)
      .filter((v) => flattenStyle(v.props.style).paddingHorizontal === UI_TAB_ROOT_INSET);
    expect(insetViews.length).toBeGreaterThan(0);
    act(() => tree.unmount());
  });

  it("does not render suppressed HTTP 404 error text", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ProfileMainScreen
          profile={defaultUserProfileMain()}
          status="error"
          errorMessage="HTTP 404 (kind=http, status=404)"
          massUnit="lb"
          twin={TWIN}
          healthAssessmentHref="/(app)/profile/health-assessment"
          healthAssessmentHasProgress={false}
          healthAssessmentCompletionPercent={0}
          healthBaselineHref="/(app)/profile/health-baseline"
          healthBaselineCompleteness={null}
          healthBaselineConfidence={null}
          targetStateHref="/(app)/profile/target-state"
          targetStateCoverage={null}
          targetStateConfidence={null}
        />,
      );
    });
    const text = collectText(tree.root);
    expect(text).not.toContain("HTTP 404");
    expect(text).toContain("General");
    act(() => tree.unmount());
  });

  it("renders non-404 error text when status is error", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ProfileMainScreen
          profile={defaultUserProfileMain()}
          status="error"
          errorMessage="HTTP 503 (kind=http, status=503)"
          massUnit="lb"
          twin={TWIN}
          healthAssessmentHref="/(app)/profile/health-assessment"
          healthAssessmentHasProgress={false}
          healthAssessmentCompletionPercent={0}
          healthBaselineHref="/(app)/profile/health-baseline"
          healthBaselineCompleteness={null}
          healthBaselineConfidence={null}
          targetStateHref="/(app)/profile/target-state"
          targetStateCoverage={null}
          targetStateConfidence={null}
        />,
      );
    });
    expect(collectText(tree.root)).toContain("HTTP 503");
    act(() => tree.unmount());
  });
});
