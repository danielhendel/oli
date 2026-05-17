import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { getSleepNight } from "@/lib/api/usersMe";
import { useSleepNight } from "../useSleepNight";

const mockUseAuth = jest.fn();

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getSleepNight: jest.fn(),
}));

const getSleepNightMock = getSleepNight as jest.MockedFunction<typeof getSleepNight>;

function Probe() {
  const { view, settled } = useSleepNight("2026-05-17");
  return (
    <Text testID="out">
      {settled ? (view ? `ready:${view.sleepNight.mainSleepMinutes ?? 0}` : "missing") : "pending"}
    </Text>
  );
}

describe("useSleepNight account switch", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-a" },
      initializing: false,
      getIdToken: jest.fn(async () => "tok"),
    });
    getSleepNightMock.mockReset();
    getSleepNightMock.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: "2026-05-17",
        anchorDay: "2026-05-17",
        wakeDay: "2026-05-17",
        resolution: "exact_anchor",
        isFallback: false,
        sleepNight: {
          anchorDay: "2026-05-17",
          wakeDay: "2026-05-17",
          provider: "oura",
          source: "ouraVendorSleep",
          sourceDocumentId: "s1",
          isComplete: true,
          mainSleepMinutes: 445,
          updatedAt: "2026-05-17T12:00:00.000Z",
        },
      },
    });
  });

  it("clears prior user sleep before the next account fetch settles", async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(root.root.findByProps({ testID: "out" }).props.children).toBe("ready:445");

    getSleepNightMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      requestId: null,
      error: "not found",
      kind: "http",
    } as never);

    mockUseAuth.mockReturnValue({
      user: { uid: "user-b" },
      initializing: false,
      getIdToken: jest.fn(async () => "tok"),
    });

    await act(async () => {
      root.update(<Probe />);
    });
    const mid = root.root.findByProps({ testID: "out" }).props.children;
    expect(mid === "pending" || mid === "missing").toBe(true);

    await act(async () => {
      await Promise.resolve();
    });
    expect(root.root.findByProps({ testID: "out" }).props.children).toBe("missing");
    expect(getSleepNightMock).toHaveBeenLastCalledWith("2026-05-17", "tok", undefined);
  });
});
