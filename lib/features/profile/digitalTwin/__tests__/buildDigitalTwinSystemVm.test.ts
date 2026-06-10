// lib/features/profile/digitalTwin/__tests__/buildDigitalTwinSystemVm.test.ts
import { buildDigitalTwinSystemVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinSystemVm";
import { getDigitalTwinSystem } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { emptyCtx, healthScoreDoc } from "../__fixtures__/twinFixtures";

function sys(id: string) {
  const s = getDigitalTwinSystem(id);
  if (!s) throw new Error(`missing system ${id}`);
  return s;
}

describe("buildDigitalTwinSystemVm", () => {
  it("sleep-recovery follows the HealthScore recovery domain tier", () => {
    const ctx = emptyCtx({ healthScore: { status: "ready", data: healthScoreDoc() } });
    const vm = buildDigitalTwinSystemVm(sys("sleep-recovery"), ctx);
    expect(vm.status).toBe("good"); // recovery domain tier === "good"
    expect(vm.statusLabel).toBe("Good");
  });

  it("metabolic maps the nutrition domain tier to strong", () => {
    const ctx = emptyCtx({ healthScore: { status: "ready", data: healthScoreDoc() } });
    const vm = buildDigitalTwinSystemVm(sys("metabolic"), ctx);
    expect(vm.status).toBe("strong"); // nutrition domain tier === "excellent"
  });

  it("a non domain-backed system needs data and has no main metric", () => {
    const vm = buildDigitalTwinSystemVm(sys("cancer-prevention"), emptyCtx());
    expect(vm.status).toBe("needsData");
    expect(vm.needsData).toBe(true);
    expect(vm.mainMetric).toBeNull();
  });

  it("signed-out yields unavailable status", () => {
    const vm = buildDigitalTwinSystemVm(sys("cardiovascular"), emptyCtx({ signedOut: true }));
    expect(vm.status).toBe("unavailable");
  });

  it("renders every marker as a row with description, metric-page href, and no value yet", () => {
    const vm = buildDigitalTwinSystemVm(sys("cardiovascular"), emptyCtx());
    expect(vm.rows.length).toBe(sys("cardiovascular").metrics.length);
    for (const row of vm.rows) {
      expect(row.description).not.toBeNull();
      expect(row.value).toBeNull();
      expect(row.href).toMatch(/^\/\(app\)\/profile\/metric\//);
      expect(row.href).not.toMatch(/\/manage\/metric/);
      expect(row.accessibilityLabel).toContain(row.label);
    }
  });

  it("row href targets the metric detail page by id", () => {
    const vm = buildDigitalTwinSystemVm(sys("cardiovascular"), emptyCtx());
    const apob = vm.rows.find((r) => r.id === "apob");
    expect(apob?.href).toBe("/(app)/profile/metric/apob");
  });
});
