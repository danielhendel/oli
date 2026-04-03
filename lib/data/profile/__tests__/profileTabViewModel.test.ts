import { describe, expect, it } from "@jest/globals";
import { defaultUserProfileMain } from "@oli/contracts";
import {
  buildProfileTabViewModel,
  isSuppressedProfileMainErrorMessage,
} from "../profileTabViewModel";
import type { UserProfileMainState } from "../useUserProfileMain";

describe("isSuppressedProfileMainErrorMessage", () => {
  it("suppresses hook-shaped HTTP 404 messages", () => {
    expect(
      isSuppressedProfileMainErrorMessage("HTTP 404 (kind=http, status=404)"),
    ).toBe(true);
  });

  it("does not suppress other HTTP errors", () => {
    expect(isSuppressedProfileMainErrorMessage("HTTP 500 (kind=http, status=500)")).toBe(
      false,
    );
  });
});

describe("buildProfileTabViewModel", () => {
  it("ready + defaults: no error banner fields", () => {
    const state: UserProfileMainState = { status: "ready", profile: defaultUserProfileMain() };
    const vm = buildProfileTabViewModel(state);
    expect(vm.errorMessage).toBeUndefined();
    expect(vm.displayStatus).toBe("ready");
    expect(vm.profile).toEqual(defaultUserProfileMain());
  });

  it("error with null profile: ready chrome, no errorMessage, still shows resolved defaults", () => {
    const state: UserProfileMainState = {
      status: "error",
      profile: null,
      message: "HTTP 503 (kind=http, status=503)",
    };
    const vm = buildProfileTabViewModel(state);
    expect(vm.displayStatus).toBe("ready");
    expect(vm.errorMessage).toBeUndefined();
    expect(vm.profile).toEqual(defaultUserProfileMain());
  });

  it("error with HTTP 404 and cached base profile: no banner, ready chrome (PUT 404 case)", () => {
    const base = defaultUserProfileMain();
    const state: UserProfileMainState = {
      status: "error",
      profile: base,
      message: "HTTP 404 (kind=http, status=404)",
    };
    const vm = buildProfileTabViewModel(state);
    expect(vm.displayStatus).toBe("ready");
    expect(vm.errorMessage).toBeUndefined();
    expect(vm.profile).toBe(base);
  });

  it("error with real failure and cached profile: surfaces message, keeps error status", () => {
    const base = defaultUserProfileMain();
    const state: UserProfileMainState = {
      status: "error",
      profile: base,
      message: "HTTP 503 (kind=http, status=503)",
    };
    const vm = buildProfileTabViewModel(state);
    expect(vm.displayStatus).toBe("error");
    expect(vm.errorMessage).toBe("HTTP 503 (kind=http, status=503)");
    expect(vm.profile).toBe(base);
  });

  it("partial with null: hydrating, resolved defaults", () => {
    const state: UserProfileMainState = { status: "partial", profile: null };
    const vm = buildProfileTabViewModel(state);
    expect(vm.hydrating).toBe(true);
    expect(vm.isSaving).toBe(false);
    expect(vm.profile).toEqual(defaultUserProfileMain());
  });

  it("ready with null profile: not hydrating, resolved defaults for UI", () => {
    const state: UserProfileMainState = { status: "ready", profile: null };
    const vm = buildProfileTabViewModel(state);
    expect(vm.hydrating).toBe(false);
    expect(vm.isSaving).toBe(false);
    expect(vm.displayStatus).toBe("ready");
    expect(vm.profile).toEqual(defaultUserProfileMain());
  });
});
