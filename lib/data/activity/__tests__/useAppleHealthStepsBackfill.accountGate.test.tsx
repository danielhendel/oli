import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockGetConnected = jest.fn(async () => false);
const mockRequestPermissions = jest.fn(async () => ({ ok: true as const }));
const mockRunBackfill = jest.fn(async () => ({ ok: true as const, daysIngested: 0 }));

jest.mock("@/lib/integrations/appleHealth", () => ({
  pullStepCountForLocalCalendarDay: jest.fn(),
  requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  runAppleHealthStepsBackfill: (...args: unknown[]) => mockRunBackfill(...args),
  stepsIdempotencyKey: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthStepsBackfillState: jest.fn(async () => null),
  setAppleHealthStepsBackfillState: jest.fn(async () => undefined),
  getAppleHealthConnected: (...args: unknown[]) => mockGetConnected(...args),
  // Domain gate wraps connected: not connected → domain disabled.
  isAppleHealthDomainEnabled: (...args: unknown[]) => mockGetConnected(...args),
}));

jest.mock("@/lib/data/activity/appleHealthStepsBackfillMutex", () => ({
  runAppleHealthStepsBackfillSerialized: async <T,>(fn: () => Promise<T>) => fn(),
}));

jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  scheduleDailyFactsInvalidationAfterIngest: jest.fn(),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: jest.fn(async () => "token"),
  }),
}));

import { useAppleHealthStepsBackfill } from "../useAppleHealthStepsBackfill";

function Host({ onReady }: { onReady: (api: ReturnType<typeof useAppleHealthStepsBackfill>) => void }) {
  const api = useAppleHealthStepsBackfill();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe("useAppleHealthStepsBackfill account gate", () => {
  beforeEach(() => {
    mockGetConnected.mockReset();
    mockRequestPermissions.mockReset();
    mockRunBackfill.mockReset();
    mockGetConnected.mockResolvedValue(false);
    mockRequestPermissions.mockResolvedValue({ ok: true });
    mockRunBackfill.mockResolvedValue({ ok: true, daysIngested: 0 });
  });

  it("does not request permissions or backfill when not connected", async () => {
    let api: ReturnType<typeof useAppleHealthStepsBackfill> | null = null;
    await act(async () => {
      renderer.create(
        React.createElement(Host, {
          onReady: (next) => {
            api = next;
          },
        }),
      );
    });
    await act(async () => {
      await api!.start();
    });
    expect(mockGetConnected).toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockRunBackfill).not.toHaveBeenCalled();
  });

  it("runs backfill after account connection", async () => {
    mockGetConnected.mockResolvedValue(true);
    let api: ReturnType<typeof useAppleHealthStepsBackfill> | null = null;
    await act(async () => {
      renderer.create(
        React.createElement(Host, {
          onReady: (next) => {
            api = next;
          },
        }),
      );
    });
    await act(async () => {
      await api!.start();
    });
    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockRunBackfill).toHaveBeenCalled();
  });
});
