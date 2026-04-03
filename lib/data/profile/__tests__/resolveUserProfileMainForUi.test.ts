import { describe, expect, it } from "@jest/globals";
import { defaultUserProfileMain } from "@oli/contracts";
import { resolveUserProfileMainForUi } from "../resolveUserProfileMainForUi";
import type { UserProfileMainState } from "../useUserProfileMain";

describe("resolveUserProfileMainForUi", () => {
  it("returns null when auth user is missing", () => {
    const state: UserProfileMainState = { status: "missing" };
    expect(resolveUserProfileMainForUi(state)).toBeNull();
  });

  it("returns server profile when ready", () => {
    const p = defaultUserProfileMain();
    const state: UserProfileMainState = { status: "ready", profile: p };
    expect(resolveUserProfileMainForUi(state)).toBe(p);
  });

  it("returns defaults when ready with null profile (no Firestore doc yet)", () => {
    const state: UserProfileMainState = { status: "ready", profile: null };
    expect(resolveUserProfileMainForUi(state)).toEqual(defaultUserProfileMain());
  });

  it("returns defaults when partial and server profile not loaded yet", () => {
    const state: UserProfileMainState = { status: "partial", profile: null };
    expect(resolveUserProfileMainForUi(state)).toEqual(defaultUserProfileMain());
  });

  it("returns server profile when partial with cached profile", () => {
    const p = defaultUserProfileMain();
    const state: UserProfileMainState = { status: "partial", profile: p };
    expect(resolveUserProfileMainForUi(state)).toBe(p);
  });

  it("returns defaults on error with no cached profile (no infinite-loading null)", () => {
    const state: UserProfileMainState = {
      status: "error",
      profile: null,
      message: "HTTP 404 (kind=http, status=404)",
    };
    expect(resolveUserProfileMainForUi(state)).toEqual(defaultUserProfileMain());
  });

  it("returns cached profile on error when present", () => {
    const p = defaultUserProfileMain();
    const state: UserProfileMainState = {
      status: "error",
      profile: p,
      message: "network",
    };
    expect(resolveUserProfileMainForUi(state)).toBe(p);
  });
});
