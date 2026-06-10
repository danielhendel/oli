// lib/features/profile/digitalTwin/__tests__/buildDigitalTwinOverviewVm.test.ts
import { buildDigitalTwinOverviewVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinOverviewVm";
import type { CompletenessVm } from "@/lib/features/profile/digitalTwin/types";
import { emptyCtx, healthScoreDoc, healthSignalDoc } from "../__fixtures__/twinFixtures";

const completeness: CompletenessVm = {
  systemsWithData: 3,
  systemsTrackable: 8,
  systemsNeedingData: 5,
  bySystem: {} as CompletenessVm["bySystem"],
};

describe("buildDigitalTwinOverviewVm", () => {
  it("surfaces HealthScore composite + tier and HealthSignals status", () => {
    const ctx = emptyCtx({
      healthScore: { status: "ready", data: healthScoreDoc({ compositeScore: 82, compositeTier: "good" }) },
      healthSignals: { status: "ready", data: healthSignalDoc({ status: "stable" }) },
    });
    const vm = buildDigitalTwinOverviewVm({ ctx, completeness, loading: false });
    expect(vm.compositeScore).toBe(82);
    expect(vm.compositeTierLabel).toBe("Good");
    expect(vm.signalStatusLabel).toBe("Stable");
    expect(vm.signalAttention).toBe(false);
    expect(vm.insufficientData).toBe(false);
    expect(vm.completenessLabel).toContain("3 of 8");
    expect(vm.lastUpdated).toBe("2026-06-09T08:00:00.000Z");
  });

  it("maps attention_required to attention", () => {
    const ctx = emptyCtx({
      healthSignals: { status: "ready", data: healthSignalDoc({ status: "attention_required" }) },
    });
    const vm = buildDigitalTwinOverviewVm({ ctx, completeness, loading: false });
    expect(vm.signalStatusLabel).toBe("Attention Required");
    expect(vm.signalAttention).toBe(true);
  });

  it("insufficient_data never shows a fake zero score", () => {
    const ctx = emptyCtx({
      healthScore: { status: "ready", data: healthScoreDoc({ status: "insufficient_data", compositeScore: 0 }) },
    });
    const vm = buildDigitalTwinOverviewVm({ ctx, completeness, loading: false });
    expect(vm.insufficientData).toBe(true);
    expect(vm.compositeScore).toBeNull();
    expect(vm.compositeTierLabel).toBeNull();
  });

  it("omits score and last-updated when sources are missing", () => {
    const vm = buildDigitalTwinOverviewVm({ ctx: emptyCtx(), completeness, loading: false });
    expect(vm.compositeScore).toBeNull();
    expect(vm.signalStatusLabel).toBeNull();
    expect(vm.lastUpdated).toBeNull();
  });
});
