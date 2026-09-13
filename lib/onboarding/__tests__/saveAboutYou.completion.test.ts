import { CURRENT_ONBOARDING_VERSION } from "@oli/contracts";

import { buildAboutYouProfilePatch } from "../saveAboutYou";
import type { AboutYouValidated } from "../aboutYouValidation";

describe("saveAboutYou completion semantics", () => {
  it("stamps onboarding completed at the current version after About You", () => {
    const value: AboutYouValidated = {
      preferredName: "Sam",
      dateOfBirth: "1990-05-15",
      sexAtBirth: "female",
      heightCm: 170,
      weightKg: null,
    };
    const patch = buildAboutYouProfilePatch(value);
    expect(patch.app?.onboarding).toEqual({
      status: "completed",
      step: "about_you",
      version: CURRENT_ONBOARDING_VERSION,
    });
    expect(CURRENT_ONBOARDING_VERSION).toBe(2);
  });
});
