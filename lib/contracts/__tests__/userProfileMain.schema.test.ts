import {
  defaultUserProfileMain,
  materializeUserProfileMainForPutCreate,
  mergeUserProfileMain,
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

  it("materializeUserProfileMainForPutCreate applies patch onto schema baseline", () => {
    const patch = userProfileMainPatchSchema.parse({ identity: { firstName: "New" } });
    const next = materializeUserProfileMainForPutCreate(patch);
    expect(next.identity.firstName).toBe("New");
    expect(userProfileMainSchema.safeParse(next).success).toBe(true);
  });
});
