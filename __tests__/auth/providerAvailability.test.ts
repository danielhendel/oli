/// <reference types="jest" />

import { resolveAvailableAuthProviders } from "../../lib/auth/helpers";

describe("resolveAvailableAuthProviders", () => {
  test("apple only", () => {
    const r = resolveAvailableAuthProviders({ appleAvailable: true, googleClientId: "" });
    expect(r).toEqual(["apple"]);
  });

  test("google only", () => {
    const r = resolveAvailableAuthProviders({ appleAvailable: false, googleClientId: "abc" });
    expect(r).toEqual(["google"]);
  });

  test("both apple and google", () => {
    const r = resolveAvailableAuthProviders({ appleAvailable: true, googleClientId: "abc" });
    expect(r).toEqual(["apple", "google"]);
  });

  test("none available", () => {
    const r = resolveAvailableAuthProviders({ appleAvailable: false, googleClientId: "" });
    expect(r).toEqual([]);
  });
});
