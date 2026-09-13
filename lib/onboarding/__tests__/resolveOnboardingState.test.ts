import { defaultUserProfileMain } from "@oli/contracts";

import {
  needsOnboardingCompletionStamp,
  onboardingHrefForState,
  resolveOnboardingState,
} from "../resolveOnboardingState";

function completeAboutYouProfile() {
  const profile = defaultUserProfileMain();
  profile.identity.firstName = "Sam";
  profile.identity.dateOfBirth = "1990-05-15";
  profile.identity.sexAtBirth = "female";
  profile.body.heightCm = 170;
  return profile;
}

describe("resolveOnboardingState", () => {
  it("returns opening when signed out", () => {
    expect(
      resolveOnboardingState({
        auth: "signed_out",
        deletionPending: false,
        profileStatus: "missing",
        profile: null,
      }).kind,
    ).toBe("opening");
  });

  it("returns resolving while auth initializing or profile loading", () => {
    expect(
      resolveOnboardingState({
        auth: "initializing",
        deletionPending: false,
        profileStatus: "ready",
        profile: defaultUserProfileMain(),
      }).kind,
    ).toBe("resolving");
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "partial",
        profile: null,
      }).kind,
    ).toBe("resolving");
  });

  it("deletion pending outranks onboarding", () => {
    const profile = completeAboutYouProfile();
    profile.app.onboarding = {
      version: 1,
      status: "in_progress",
      step: "about_you",
      completedAt: null,
      updatedAt: null,
    };
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: true,
        profileStatus: "ready",
        profile,
      }).kind,
    ).toBe("deletion_pending");
  });

  it("incomplete About You resumes About You even with stale connect state", () => {
    const profile = defaultUserProfileMain();
    profile.app.onboarding = {
      version: 1,
      status: "in_progress",
      step: "connect",
      completedAt: null,
      updatedAt: "2026-09-11T00:00:00.000Z",
    };
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "ready",
        profile,
      }).kind,
    ).toBe("about_you");
  });

  it("complete About You with stale connect or understand routes Home", () => {
    const profile = completeAboutYouProfile();
    profile.app.onboarding = {
      version: 1,
      status: "in_progress",
      step: "connect",
      completedAt: null,
      updatedAt: "2026-09-11T00:00:00.000Z",
    };
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "ready",
        profile,
      }).kind,
    ).toBe("completed");

    profile.app.onboarding.step = "understand";
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "ready",
        profile,
      }).kind,
    ).toBe("completed");
  });

  it("returns completed when status completed at any stamped version with About You complete", () => {
    const profile = completeAboutYouProfile();
    profile.app.onboarding = {
      version: 1,
      status: "completed",
      step: "understand",
      completedAt: "2026-09-11T00:00:00.000Z",
      updatedAt: "2026-09-11T00:00:00.000Z",
    };
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "ready",
        profile,
      }).kind,
    ).toBe("completed");
  });

  it("needs completion stamp for stale connect/understand or older version", () => {
    const profile = completeAboutYouProfile();
    profile.app.onboarding = {
      version: 1,
      status: "in_progress",
      step: "connect",
      completedAt: null,
      updatedAt: null,
    };
    expect(needsOnboardingCompletionStamp(profile)).toBe(true);

    profile.app.onboarding = {
      version: 2,
      status: "completed",
      step: "about_you",
      completedAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
    };
    expect(needsOnboardingCompletionStamp(profile)).toBe(false);
  });

  it("maps hrefs for route states", () => {
    expect(onboardingHrefForState({ kind: "opening" })).toBe("/(onboarding)");
    expect(onboardingHrefForState({ kind: "about_you" })).toBe("/(onboarding)/about-you");
    expect(onboardingHrefForState({ kind: "connect" })).toBe("/(onboarding)/connect");
    expect(onboardingHrefForState({ kind: "understand" })).toBe("/(onboarding)/understand");
    expect(onboardingHrefForState({ kind: "completed" })).toBeNull();
  });
});
