import { defaultUserProfileMain } from "@oli/contracts";

import {
  onboardingHrefForState,
  resolveOnboardingState,
} from "../resolveOnboardingState";

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
    const profile = defaultUserProfileMain();
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

  it("maps incomplete steps", () => {
    const base = defaultUserProfileMain();
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "ready",
        profile: base,
      }).kind,
    ).toBe("about_you");

    base.app.onboarding = {
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
        profile: base,
      }).kind,
    ).toBe("connect");

    base.app.onboarding.step = "understand";
    expect(
      resolveOnboardingState({
        auth: "signed_in",
        deletionPending: false,
        profileStatus: "ready",
        profile: base,
      }).kind,
    ).toBe("understand");
  });

  it("returns completed when status completed at current version", () => {
    const profile = defaultUserProfileMain();
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

  it("maps hrefs for route states", () => {
    expect(onboardingHrefForState({ kind: "opening" })).toBe("/(onboarding)");
    expect(onboardingHrefForState({ kind: "about_you" })).toBe("/(onboarding)/about-you");
    expect(onboardingHrefForState({ kind: "connect" })).toBe("/(onboarding)/connect");
    expect(onboardingHrefForState({ kind: "understand" })).toBe("/(onboarding)/understand");
    expect(onboardingHrefForState({ kind: "completed" })).toBeNull();
  });
});
