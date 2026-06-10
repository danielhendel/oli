// lib/features/profile/digitalTwin/__tests__/buildDigitalTwinCompletenessVm.test.ts
import { buildDigitalTwinCompletenessVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinCompletenessVm";
import { buildDigitalTwinSystemVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinSystemVm";
import { DIGITAL_TWIN_SYSTEMS } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { emptyCtx, healthScoreDoc } from "../__fixtures__/twinFixtures";

function completenessFor(ctx: ReturnType<typeof emptyCtx>) {
  const systems = DIGITAL_TWIN_SYSTEMS.map((s) => buildDigitalTwinSystemVm(s, ctx));
  return { systems, vm: buildDigitalTwinCompletenessVm(systems) };
}

describe("buildDigitalTwinCompletenessVm", () => {
  it("counts trackable systems and those needing data with no data", () => {
    const { vm } = completenessFor(emptyCtx());
    expect(vm.systemsTrackable).toBe(5);
    expect(vm.systemsNeedingData).toBe(5);
    expect(vm.systemsWithData).toBe(0);
  });

  it("counts domain-backed systems with data when HealthScore is ready", () => {
    const ctx = emptyCtx({ healthScore: { status: "ready", data: healthScoreDoc() } });
    const { vm } = completenessFor(ctx);
    expect(vm.systemsWithData).toBeGreaterThan(0);
    expect(vm.bySystem["metabolic"]).toBe("strong");
  });

  it("never conflicts with HealthScore insufficient_data", () => {
    const ctx = emptyCtx({
      healthScore: { status: "ready", data: healthScoreDoc({ status: "insufficient_data" }) },
    });
    const { vm } = completenessFor(ctx);
    expect(["needsData", "watch"]).toContain(vm.bySystem["body-composition"]);
  });

  it("maps every system id", () => {
    const { vm } = completenessFor(emptyCtx());
    expect(Object.keys(vm.bySystem)).toHaveLength(DIGITAL_TWIN_SYSTEMS.length);
  });
});
