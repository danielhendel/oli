import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import {
  defaultUserProfileMain,
  mergeUserProfileMain,
  type UserProfileMain,
} from "@oli/contracts";

const mockGetIdToken = jest.fn();
const stableAuthUser = { uid: "test_uid" };
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: stableAuthUser,
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock("@/lib/api/profileMain", () => ({
  getUserProfileMain: (...args: unknown[]) => mockGet(...args),
  putUserProfileMain: (...args: unknown[]) => mockPut(...args),
}));

import { UserProfileMainProvider, useUserProfileMain } from "../useUserProfileMain";

describe("UserProfileMainProvider", () => {
  let latest: ReturnType<typeof useUserProfileMain> | null = null;

  function Capture() {
    latest = useUserProfileMain();
    return null;
  }

  beforeEach(() => {
    latest = null;
    mockGetIdToken.mockResolvedValue("id_token");
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it("settles to ready with null profile when GET returns null (no persistence assumed)", async () => {
    mockGet.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: null,
    });

    await act(async () => {
      renderer.create(
        <UserProfileMainProvider>
          <Capture />
        </UserProfileMainProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledWith("id_token");
    expect(latest?.state).toEqual({ status: "ready", profile: null });
  });

  it("first save: PUT returns document and hook stores server profile", async () => {
    mockGet.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: null,
    });

    const saved: UserProfileMain = mergeUserProfileMain(defaultUserProfileMain(), {
      identity: { firstName: "Pat" },
    });
    mockPut.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r2",
      json: saved,
    });

    await act(async () => {
      renderer.create(
        <UserProfileMainProvider>
          <Capture />
        </UserProfileMainProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(latest?.state).toEqual({ status: "ready", profile: null });

    let ok = false;
    await act(async () => {
      ok = (await latest?.patch({ identity: { firstName: "Pat" } })) ?? false;
    });

    expect(ok).toBe(true);
    expect(mockPut).toHaveBeenCalledWith("id_token", { identity: { firstName: "Pat" } });
    expect(latest?.state).toEqual({ status: "ready", profile: saved });
  });
});
