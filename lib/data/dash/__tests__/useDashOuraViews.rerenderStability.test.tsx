import React from "react";
import renderer, { act } from "react-test-renderer";

import type { SleepViewDto } from "@oli/contracts";

const mockGetOuraSleepView = jest.fn();
const mockGetOuraReadinessView = jest.fn();

jest.mock("@/lib/api/usersMe", () => ({
  getOuraSleepView: (...args: unknown[]) => mockGetOuraSleepView(...args),
  getOuraReadinessView: (...args: unknown[]) => mockGetOuraReadinessView(...args),
}));

const mockAuthUser = { uid: "u1" };
const mockGetIdToken = jest.fn().mockResolvedValue("id-token");

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

import { useDashOuraViews } from "../useDashOuraViews";

const alignedSleep: SleepViewDto = {
  requestedDay: "2026-05-01",
  resolvedDay: "2026-05-01",
  isFallback: false,
  day: "2026-05-01",
  score: 96,
  contributors: {},
};

describe("useDashOuraViews parent re-render stability", () => {
  beforeEach(() => {
    mockGetOuraSleepView.mockReset();
    mockGetOuraReadinessView.mockReset();
    mockGetOuraSleepView.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: alignedSleep,
    });
    mockGetOuraReadinessView.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: "2026-05-01",
        resolvedDay: "2026-05-01",
        isFallback: false,
        day: "2026-05-01",
        score: 1,
        contributors: {},
      },
    });
  });

  it("does not start duplicate sleep fetches when the hook re-renders with the same day / uid / enabled", async () => {
    const sink: React.MutableRefObject<ReturnType<typeof useDashOuraViews> | null> = { current: null };

    function Inner(): null {
      const s = useDashOuraViews("2026-05-01", { enabled: true });
      sink.current = s;
      return null;
    }

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Inner />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const callsAfterMount = mockGetOuraSleepView.mock.calls.length;

    await act(async () => {
      root.update(<Inner />);
      await Promise.resolve();
    });

    expect(mockGetOuraSleepView.mock.calls.length).toBe(callsAfterMount);
  });
});
