import {
  CURRENT_ONBOARDING_VERSION,
  defaultUserProfileMain,
  materializeUserProfileMainForPutCreate,
  mergeUserProfileMain,
  stampUserProfileOnboardingServerTimes,
  userProfileMainPatchSchema,
  userProfileMainSchema,
} from "../userProfileMain";

describe("userProfileMain schema", () => {
  it("accepts a full valid document", () => {
    const doc = {
      ...defaultUserProfileMain(),
      identity: {
        firstName: "Alex",
        lastName: "Rivera",
        dateOfBirth: "1990-05-12",
        sexAtBirth: "unspecified" as const,
      },
      body: { heightCm: 175 },
    };
    expect(userProfileMainSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects invalid ISO dates", () => {
    const base = defaultUserProfileMain();
    const bad = { ...base, identity: { ...base.identity, dateOfBirth: "1990-13-40" } };
    expect(userProfileMainSchema.safeParse(bad).success).toBe(false);
  });

  it("defaults onboarding to version 1 not_started", () => {
    const doc = defaultUserProfileMain();
    expect(doc.app.onboarding).toEqual({
      version: CURRENT_ONBOARDING_VERSION,
      status: "not_started",
      step: null,
      completedAt: null,
      updatedAt: null,
    });
  });

  it("mergeUserProfileMain applies partial patches", () => {
    const base = defaultUserProfileMain();
    const patch = userProfileMainPatchSchema.parse({
      identity: { firstName: "Sam" },
      bodyInputs: { athleteMode: true, primaryGoal: "maintain" },
    });
    const next = mergeUserProfileMain(base, patch);
    expect(next.identity.firstName).toBe("Sam");
    expect(next.identity.lastName).toBeNull();
    expect(next.bodyInputs.athleteMode).toBe(true);
    expect(next.bodyInputs.primaryGoal).toBe("maintain");
  });

  it("mergeUserProfileMain ignores client onboarding timestamps", () => {
    const base = defaultUserProfileMain();
    const patch = userProfileMainPatchSchema.parse({
      app: {
        onboarding: {
          status: "in_progress",
          step: "about_you",
          completedAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
        },
      },
    });
    const next = mergeUserProfileMain(base, patch);
    expect(next.app.onboarding.status).toBe("in_progress");
    expect(next.app.onboarding.step).toBe("about_you");
    expect(next.app.onboarding.completedAt).toBeNull();
    expect(next.app.onboarding.updatedAt).toBeNull();
  });

  it("stampUserProfileOnboardingServerTimes sets updatedAt and completedAt once", () => {
    const base = defaultUserProfileMain();
    const inProgress = mergeUserProfileMain(base, {
      app: { onboarding: { status: "completed", step: "understand", version: 1 } },
    });
    const stamped = stampUserProfileOnboardingServerTimes(inProgress, {
      nowIso: "2026-09-11T12:00:00.000Z",
      previousCompletedAt: null,
    });
    expect(stamped.app.onboarding.updatedAt).toBe("2026-09-11T12:00:00.000Z");
    expect(stamped.app.onboarding.completedAt).toBe("2026-09-11T12:00:00.000Z");

    const again = stampUserProfileOnboardingServerTimes(
      mergeUserProfileMain(stamped, {
        app: { onboarding: { status: "completed", step: "understand" } },
      }),
      {
        nowIso: "2026-09-12T12:00:00.000Z",
        previousCompletedAt: "2026-09-11T12:00:00.000Z",
      },
    );
    expect(again.app.onboarding.updatedAt).toBe("2026-09-12T12:00:00.000Z");
    expect(again.app.onboarding.completedAt).toBe("2026-09-11T12:00:00.000Z");
  });

  it("materializeUserProfileMainForPutCreate applies patch onto schema baseline", () => {
    const patch = userProfileMainPatchSchema.parse({ identity: { firstName: "New" } });
    const next = materializeUserProfileMainForPutCreate(patch);
    expect(next.identity.firstName).toBe("New");
    expect(next.app.onboarding.version).toBe(CURRENT_ONBOARDING_VERSION);
    expect(userProfileMainSchema.safeParse(next).success).toBe(true);
  });
});
