import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { getSleepNight } from "@/lib/api/usersMe";
import { useSleepNight } from "../useSleepNight";

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn(async () => "tok"),
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getSleepNight: jest.fn(),
}));

const getSleepNightMock = getSleepNight as jest.MockedFunction<typeof getSleepNight>;

function Probe() {
  const { view, settled } = useSleepNight("2026-05-13");
  return (
    <Text testID="out">
      {settled && view ? `${view.requestedDay}|${view.anchorDay}|${view.resolution}` : "pending"}
    </Text>
  );
}

describe("useSleepNight", () => {
  beforeEach(() => {
    getSleepNightMock.mockReset();
  });

  it("surfaces API anchorDay when requested calendar day differs (prior night)", async () => {
    getSleepNightMock.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: "2026-05-13",
        anchorDay: "2026-05-12",
        wakeDay: "2026-05-13",
        resolution: "latest_completed_prior_night",
        isFallback: false,
        sleepNight: {
          anchorDay: "2026-05-12",
          wakeDay: "2026-05-13",
          provider: "oura",
          source: "ouraVendorSleep",
          sourceDocumentId: "s1",
          isComplete: true,
          score: 77,
          updatedAt: "2026-05-13T12:00:00.000Z",
        },
      },
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const t = root.root.findByProps({ testID: "out" });
    expect(t.props.children).toBe("2026-05-13|2026-05-12|latest_completed_prior_night");
  });
});
