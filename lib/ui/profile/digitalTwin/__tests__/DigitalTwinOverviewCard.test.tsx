import React from "react";
import renderer, { act } from "react-test-renderer";

import { DigitalTwinOverviewCard } from "@/lib/ui/profile/digitalTwin/DigitalTwinOverviewCard";
import { buildDigitalTwinOverviewVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinOverviewVm";
import type { CompletenessVm } from "@/lib/features/profile/digitalTwin/types";
import {
  emptyCtx,
  healthScoreDoc,
  healthSignalDoc,
} from "@/lib/features/profile/digitalTwin/__fixtures__/twinFixtures";

const completeness: CompletenessVm = {
  systemsWithData: 2,
  systemsTrackable: 8,
  systemsNeedingData: 6,
  bySystem: {} as CompletenessVm["bySystem"],
};

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

describe("DigitalTwinOverviewCard", () => {
  it("renders HealthScore, tier, and signal status", () => {
    const ctx = emptyCtx({
      healthScore: { status: "ready", data: healthScoreDoc({ compositeScore: 82, compositeTier: "good" }) },
      healthSignals: { status: "ready", data: healthSignalDoc({ status: "stable" }) },
    });
    const overview = buildDigitalTwinOverviewVm({ ctx, completeness, loading: false });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinOverviewCard overview={overview} />);
    });
    const text = collectText(tree.root);
    expect(text).toContain("82");
    expect(text).toContain("Good");
    expect(text).toContain("Stable");
    expect(text).toContain("2 of 8");
    act(() => tree.unmount());
  });

  it("does not show a fake zero when data is insufficient", () => {
    const ctx = emptyCtx({
      healthScore: { status: "ready", data: healthScoreDoc({ status: "insufficient_data", compositeScore: 0 }) },
    });
    const overview = buildDigitalTwinOverviewVm({ ctx, completeness, loading: false });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinOverviewCard overview={overview} />);
    });
    const text = collectText(tree.root);
    expect(text).toContain("Not enough data");
    act(() => tree.unmount());
  });

  it("renders a sign-in prompt when signed out", () => {
    const overview = buildDigitalTwinOverviewVm({
      ctx: emptyCtx({ signedOut: true }),
      completeness,
      loading: false,
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DigitalTwinOverviewCard overview={overview} />);
    });
    expect(collectText(tree.root)).toContain("Sign in");
    act(() => tree.unmount());
  });
});
