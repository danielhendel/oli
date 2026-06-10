// lib/features/profile/digitalTwin/__tests__/buildDigitalTwinPrioritiesVm.test.ts
import { buildDigitalTwinPrioritiesVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinPrioritiesVm";
import { buildDigitalTwinSystemVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinSystemVm";
import { DIGITAL_TWIN_SYSTEMS } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { emptyCtx, healthSignalDoc, insights, insightItem } from "../__fixtures__/twinFixtures";

function systemsFor(ctx: ReturnType<typeof emptyCtx>) {
  return DIGITAL_TWIN_SYSTEMS.map((s) => buildDigitalTwinSystemVm(s, ctx));
}

function groupKeys(vm: ReturnType<typeof buildDigitalTwinPrioritiesVm>) {
  return vm.groups.map((g) => g.key);
}

describe("buildDigitalTwinPrioritiesVm", () => {
  it("groups insights, signal reasons, and missing inputs", () => {
    const ctx = emptyCtx({
      insights: {
        status: "ready",
        data: insights([
          insightItem({ id: "a", severity: "critical", title: "Critical sleep", tags: ["sleep"] }),
          insightItem({ id: "b", severity: "info", title: "Try a walk", tags: ["activity"] }),
        ]),
      },
      healthSignals: {
        status: "ready",
        data: healthSignalDoc({
          status: "attention_required",
          reasons: ["domain_recovery_below_threshold"],
          missingInputs: ["nutrition"],
        }),
      },
    });
    const vm = buildDigitalTwinPrioritiesVm({ ctx, systems: systemsFor(ctx) });

    expect(vm.isEmpty).toBe(false);
    expect(groupKeys(vm)).toEqual(expect.arrayContaining(["attention", "opportunities", "missingData"]));

    const attention = vm.groups.find((g) => g.key === "attention");
    expect(attention?.rows.some((r) => r.label === "Critical sleep")).toBe(true);
    expect(attention?.rows.some((r) => r.label.includes("Recovery is below"))).toBe(true);

    const opp = vm.groups.find((g) => g.key === "opportunities");
    expect(opp?.rows.some((r) => r.label === "Try a walk")).toBe(true);

    const missing = vm.groups.find((g) => g.key === "missingData");
    expect(missing?.rows.some((r) => r.label.toLowerCase().includes("nutrition"))).toBe(true);

    for (const g of vm.groups) {
      for (const r of g.rows) {
        expect(r.href).toMatch(/^\/\(app\)\//);
        expect(r.accessibilityLabel.length).toBeGreaterThan(0);
      }
    }
  });

  it("empty priorities show the clean empty copy", () => {
    const ctx = emptyCtx({
      insights: { status: "ready", data: insights([]) },
      healthSignals: { status: "ready", data: healthSignalDoc() },
    });
    // Only systems with no data + no CTA contribute nothing; force all systems to look tracked
    // by signing out is wrong; instead use a ctx where needs-data systems still appear. To assert
    // the empty branch we filter to systems that are not needs-data.
    const systems = systemsFor(ctx).map((s) => ({ ...s, needsData: false }));
    const vm = buildDigitalTwinPrioritiesVm({ ctx, systems });
    expect(vm.isEmpty).toBe(true);
    expect(vm.emptyCopy).toBe("Nothing needs attention today.");
    expect(vm.groups).toHaveLength(0);
  });

  it("does not invent an opportunity score", () => {
    const ctx = emptyCtx({
      insights: { status: "ready", data: insights([insightItem({ severity: "info", title: "Tip" })]) },
    });
    const vm = buildDigitalTwinPrioritiesVm({ ctx, systems: systemsFor(ctx) });
    const opp = vm.groups.find((g) => g.key === "opportunities");
    expect(opp?.rows.every((r) => !/score/i.test(r.label))).toBe(true);
  });
});
