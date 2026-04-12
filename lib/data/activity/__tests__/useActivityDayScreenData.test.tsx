import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@/lib/api/usersMe", () => ({
  getDailyFacts: jest.fn(),
}));

/** Stable identity — `useActivityDaySteps` depends on `getIdToken`; a new fn each render retriggers fetch forever. */
const mockAuth = {
  user: { uid: "u1" },
  initializing: false,
  getIdToken: jest.fn().mockResolvedValue("token-1"),
};

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

import { getDailyFacts } from "@/lib/api/usersMe";
import { useActivityDayScreenData } from "@/lib/data/activity/useActivityDayScreenData";

function Harness({ raw, probe }: { raw: unknown; probe: { current: ReturnType<typeof useActivityDayScreenData> | null } }) {
  const v = useActivityDayScreenData(raw);
  probe.current = v;
  return null;
}

describe("useActivityDayScreenData", () => {
  beforeEach(() => {
    (getDailyFacts as jest.Mock).mockClear();
    (getDailyFacts as jest.Mock).mockImplementation(async (day: string) => ({
      ok: true as const,
      status: 200,
      requestId: "r0",
      json: {
        schemaVersion: 1 as const,
        userId: "u1",
        date: day,
        computedAt: "2026-06-15T12:00:00.000Z",
      },
    }));
  });

  it("marks invalid route param without calling getDailyFacts", async () => {
    const probe: { current: ReturnType<typeof useActivityDayScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness raw="not-a-day" probe={probe} />);
    });
    expect(probe.current?.normalized.ok).toBe(false);
    expect(getDailyFacts).not.toHaveBeenCalled();
  });

  it("accepts string[] and uses first element", async () => {
    const probe: { current: ReturnType<typeof useActivityDayScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness raw={["2026-06-15", "ignored"]} probe={probe} />);
    });
    expect(probe.current?.normalized).toEqual({ ok: true, day: "2026-06-15" });
  });

  it("fetches daily facts for valid day", async () => {
    (getDailyFacts as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-06-20",
        computedAt: "2026-06-20T12:00:00.000Z",
        activity: { steps: 4444 },
      },
    });
    const probe: { current: ReturnType<typeof useActivityDayScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness raw="2026-06-20" probe={probe} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(getDailyFacts).toHaveBeenCalledWith("2026-06-20", "token-1");
    expect(probe.current?.state).toEqual({ status: "ready", steps: 4444 });
  });
});
