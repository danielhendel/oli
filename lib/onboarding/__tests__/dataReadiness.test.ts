import { defaultUserProfileMain } from "@oli/contracts";

import { buildDataReadinessViewModel } from "../dataReadiness";

describe("buildDataReadinessViewModel", () => {
  it("marks weight/steps/sleep missing when DailyFacts lack slices", () => {
    const profile = defaultUserProfileMain();
    profile.identity.firstName = "Sam";
    profile.identity.dateOfBirth = "1990-01-01";
    profile.identity.sexAtBirth = "female";
    profile.body.heightCm = 165;

    const vm = buildDataReadinessViewModel({
      profile,
      appleHealthConnected: false,
      appleHealthAvailable: true,
      ouraConnected: false,
      dailyFacts: null,
      dailyFactsStatus: "missing",
    });

    expect(vm.signals.find((s) => s.id === "profile")?.state).toBe("present");
    expect(vm.signals.find((s) => s.id === "weight")?.state).toBe("missing");
    expect(vm.signals.find((s) => s.id === "steps")?.state).toBe("missing");
    expect(vm.signals.find((s) => s.id === "sleep")?.state).toBe("missing");
    expect(vm.signals.find((s) => s.id === "apple_health")?.state).toBe("missing");
    expect(vm.canContinue).toBe(true);
  });

  it("marks apple health unavailable when platform cannot provide it", () => {
    const vm = buildDataReadinessViewModel({
      profile: null,
      appleHealthConnected: false,
      appleHealthAvailable: false,
      ouraConnected: null,
      dailyFacts: null,
      dailyFactsStatus: "error",
    });
    expect(vm.signals.find((s) => s.id === "apple_health")?.state).toBe("unavailable");
    expect(vm.signals.find((s) => s.id === "weight")?.state).toBe("unavailable");
  });

  it("marks present when facts and connections exist", () => {
    const profile = defaultUserProfileMain();
    profile.identity.firstName = "Sam";
    profile.identity.dateOfBirth = "1990-01-01";
    profile.identity.sexAtBirth = "male";
    profile.body.heightCm = 180;

    const vm = buildDataReadinessViewModel({
      profile,
      appleHealthConnected: true,
      appleHealthAvailable: true,
      ouraConnected: true,
      dailyFacts: {
        day: "2026-09-11",
        body: { weightKg: 80 },
        activity: { steps: 5000 },
        sleep: { totalMinutes: 420 },
      } as never,
      dailyFactsStatus: "ready",
    });

    expect(vm.signals.find((s) => s.id === "weight")?.state).toBe("present");
    expect(vm.signals.find((s) => s.id === "steps")?.state).toBe("present");
    expect(vm.signals.find((s) => s.id === "sleep")?.state).toBe("present");
    expect(vm.signals.find((s) => s.id === "apple_health")?.state).toBe("present");
    expect(vm.signals.find((s) => s.id === "oura")?.state).toBe("present");
  });
});
