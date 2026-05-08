/**
 * Wires the Daily Energy NEAT freshness fix end-to-end on the client:
 *
 *   Apple Health steps ingest succeeds
 *   → backend recompute writes new `dailyFacts.energy.factors.steps`
 *   → `invalidateDailyFactsSessionCache` notifies `useDailyFacts`
 *   → `useDailyEnergyCard` re-emits the fresh energy DTO
 *
 * No UI-side calorie math is computed; we only verify the data hook sees the
 * refreshed values from the API mock after invalidation.
 */
import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDailyFacts } from "@/lib/api/usersMe";
import {
  __testing_resetDailyFactsInvalidationListeners,
  __testing_resetDailyFactsSessionCache,
  invalidateDailyFactsSessionCache,
} from "@/lib/data/dailyFactsSessionCache";

jest.mock("@/lib/api/usersMe", () => ({
  getDailyFacts: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

const mockGetDailyFacts = getDailyFacts as jest.MockedFunction<typeof getDailyFacts>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function dailyFactsResponse(steps: number, kcalLow: number, kcalHigh: number) {
  return {
    ok: true as const,
    status: 200,
    requestId: "req-1",
    json: {
      userId: "test-uid",
      date: "2026-05-07",
      activity: { steps },
      energy: {
        modelVersion: "v1",
        computedAt: "2026-05-07T12:00:00.000Z",
        day: "2026-05-07",
        estimatedKcal: { low: kcalLow + 1500, high: kcalHigh + 1500, midpoint: kcalLow + 1500 },
        variancePct: 5,
        confidence: "moderate" as const,
        factors: { steps: { kcalLow, kcalHigh, confidence: "moderate" as const } },
        missingRequiredInputs: [],
        largestDriver: "steps" as const,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __testing_resetDailyFactsInvalidationListeners();
  __testing_resetDailyFactsSessionCache();
  mockUseAuth.mockReturnValue({
    user: { uid: "test-uid" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("id-token"),
  } as unknown as ReturnType<typeof useAuth>);
});

type CardState = ReturnType<typeof useDailyEnergyCard>;

function Harness(props: { onState: (s: CardState) => void }) {
  const state = useDailyEnergyCard("2026-05-07");
  const stableRef = useRef(props.onState);
  stableRef.current = props.onState;
  useEffect(() => {
    stableRef.current(state);
  }, [state]);
  return null;
}

it("refetches energy after invalidateDailyFactsSessionCache for matching (uid, day)", async () => {
  // First call (initial mount) returns stale 419-step factor.
  // Second call (after invalidation refetch) returns fresh 6651-step factor.
  mockGetDailyFacts
    .mockResolvedValueOnce(dailyFactsResponse(419, 17, 21) as never)
    .mockResolvedValueOnce(dailyFactsResponse(6651, 270, 333) as never);

  let latest: CardState | null = null;
  await act(async () => {
    renderer.create(<Harness onState={(s) => (latest = s)} />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(latest).not.toBeNull();
  expect(latest!.energy?.factors.steps).toEqual(
    expect.objectContaining({ kcalLow: 17, kcalHigh: 21 }),
  );

  // Simulate the auto-repair coordinator firing the deferred invalidation
  // *after* the backend recompute has settled.
  await act(async () => {
    invalidateDailyFactsSessionCache({ userUid: "test-uid", day: "2026-05-07" });
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockGetDailyFacts).toHaveBeenCalledTimes(2);
  expect(latest!.energy?.factors.steps).toEqual(
    expect.objectContaining({ kcalLow: 270, kcalHigh: 333 }),
  );

  // Cache-bust marker proves the refetch bypasses the 30s session cache.
  const lastCall = mockGetDailyFacts.mock.calls[mockGetDailyFacts.mock.calls.length - 1];
  expect(String(lastCall?.[2]?.cacheBust ?? "")).toContain("dailyFactsInvalidated");
});

it("ignores invalidation events for a different user or day", async () => {
  mockGetDailyFacts.mockResolvedValue(dailyFactsResponse(500, 20, 25) as never);

  await act(async () => {
    renderer.create(<Harness onState={() => undefined} />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  const initialCalls = mockGetDailyFacts.mock.calls.length;

  await act(async () => {
    invalidateDailyFactsSessionCache({ userUid: "other-uid", day: "2026-05-07" });
  });
  await act(async () => {
    invalidateDailyFactsSessionCache({ userUid: "test-uid", day: "2026-05-06" });
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockGetDailyFacts).toHaveBeenCalledTimes(initialCalls);
});

it("never references calorie math from the UI hook (regression guard)", () => {
  const src = require("fs").readFileSync(
    require("path").resolve(__dirname, "../useDailyEnergyCard.ts"),
    "utf8",
  ) as string;
  expect(src.includes("kcalPerStep")).toBe(false);
  expect(src.includes("computeDailyEnergy")).toBe(false);
});
