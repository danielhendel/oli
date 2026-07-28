import { describe, expect, it } from "@jest/globals";
import {
  USER_DATA_DOMAIN_IDS,
  USER_DATA_DOMAIN_REGISTRY,
  getUserDataDomain,
  isPlaceholderDomain,
  listUserDataDomains,
} from "../userDataDomainRegistry";

describe("userDataDomainRegistry", () => {
  it("includes all required domains", () => {
    expect(USER_DATA_DOMAIN_IDS).toEqual([
      "identity",
      "demographics",
      "preferences",
      "goals",
      "devices",
      "medical_history",
      "medications",
      "supplements",
      "labs",
      "scans",
      "dna",
      "sleep",
      "readiness",
      "activity",
      "energy",
      "strength",
      "cardio",
      "nutrition",
      "body_composition",
      "workouts",
      "files",
      "privacy",
      "export",
      "deletion",
    ]);
    expect(listUserDataDomains()).toHaveLength(USER_DATA_DOMAIN_IDS.length);
  });

  it("marks placeholder domains and never counts them as implemented", () => {
    for (const id of ["medical_history", "medications", "supplements", "scans", "dna"] as const) {
      expect(isPlaceholderDomain(id)).toBe(true);
      expect(getUserDataDomain(id).capabilityLevel).toBe("placeholder");
      expect(getUserDataDomain(id).structuredPersistenceExists).toBe(false);
    }
  });

  it("does not mark Labs as having a real structured parser", () => {
    const labs = getUserDataDomain("labs");
    expect(labs.capabilityLevel).toBe("partial");
    expect(labs.knownGaps.some((g) => /extraction|parser/i.test(g))).toBe(true);
  });

  it("marks Withings honesty in devices known gaps", () => {
    const devices = USER_DATA_DOMAIN_REGISTRY.devices;
    expect(devices.knownGaps.some((g) => /Withings/i.test(g))).toBe(true);
  });

  it("does not hardcode user counts into the registry", () => {
    const blob = JSON.stringify(USER_DATA_DOMAIN_REGISTRY);
    expect(blob).not.toMatch(/"recordCount"|uploadCount":\s*[1-9]/);
  });
});
