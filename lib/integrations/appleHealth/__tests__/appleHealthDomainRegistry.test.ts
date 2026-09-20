import {
  APPLE_HEALTH_BODY_READ_TYPES,
  APPLE_HEALTH_DOMAIN_REGISTRY,
  assertBodyBundleExcludesUnrelatedTypes,
  buildAppleHealthConnectAllReadTypes,
  getAppleHealthDomainDefinition,
  listImplementedAppleHealthDomains,
} from "@/lib/integrations/appleHealth/appleHealthDomainRegistry";
import { BODY_COMPOSITION_CONNECT_READ_PERMISSIONS } from "@/lib/integrations/appleHealth";

describe("Apple Health domain registry", () => {
  it("defines Body bundle as Weight, Body Fat %, Lean Body Mass only", () => {
    expect([...APPLE_HEALTH_BODY_READ_TYPES]).toEqual([
      "BodyMass",
      "BodyFatPercentage",
      "LeanBodyMass",
    ]);
    expect([...BODY_COMPOSITION_CONNECT_READ_PERMISSIONS]).toEqual([
      ...APPLE_HEALTH_BODY_READ_TYPES,
    ]);
    expect(() => assertBodyBundleExcludesUnrelatedTypes(APPLE_HEALTH_BODY_READ_TYPES)).not.toThrow();
  });

  it("excludes Steps, Workouts, Heart, Energy from Body bundle", () => {
    for (const t of [
      "StepCount",
      "Workout",
      "HeartRate",
      "RestingHeartRate",
      "ActiveEnergyBurned",
      "AppleExerciseTime",
      "DistanceWalkingRunning",
    ]) {
      expect(APPLE_HEALTH_BODY_READ_TYPES).not.toContain(t);
    }
  });

  it("Connect all union includes only implemented domains", () => {
    const all = buildAppleHealthConnectAllReadTypes();
    expect(all).toContain("BodyMass");
    expect(all).toContain("StepCount");
    expect(all).toContain("Workout");
    const unimplemented = APPLE_HEALTH_DOMAIN_REGISTRY.filter((d) => !d.implemented);
    for (const d of unimplemented) {
      expect(d.readTypes).toHaveLength(0);
    }
    expect(listImplementedAppleHealthDomains().every((d) => d.implemented)).toBe(true);
    expect(getAppleHealthDomainDefinition("body").displayName).toBe("Body Composition");
  });
});
