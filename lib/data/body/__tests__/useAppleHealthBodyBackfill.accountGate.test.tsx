import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockGetConnected = jest.fn(async () => false);
const mockRequestPermissions = jest.fn(async () => ({ ok: true as const }));
const mockRunBackfill = jest.fn(async () => ({ ok: true as const }));

jest.mock("@/lib/integrations/appleHealth", () => ({
  appleHealthBodyCompositionIdempotencyKey: jest.fn(),
  appleHealthBodyWeightIdempotencyKey: jest.fn(),
  pullBodyCompositionSamples: jest.fn(),
  requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  runAppleHealthBodyBackfill: (...args: unknown[]) => mockRunBackfill(...args),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyBackfillState: jest.fn(async () => null),
  setAppleHealthBodyBackfillState: jest.fn(async () => undefined),
  getAppleHealthConnected: (...args: unknown[]) => mockGetConnected(...args),
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

import { useAppleHealthBodyBackfill } from "../useAppleHealthBodyBackfill";

function Host({ onReady }: { onReady: (api: ReturnType<typeof useAppleHealthBodyBackfill>) => void }) {
  const api = useAppleHealthBodyBackfill();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe("useAppleHealthBodyBackfill account gate", () => {
  beforeEach(() => {
    mockGetConnected.mockReset();
    mockRequestPermissions.mockReset();
    mockRunBackfill.mockReset();
    mockGetConnected.mockResolvedValue(false);
    mockRequestPermissions.mockResolvedValue({ ok: true });
    mockRunBackfill.mockResolvedValue({ ok: true });
  });

  it("does not request permissions or backfill when not connected", async () => {
    let api: ReturnType<typeof useAppleHealthBodyBackfill> | null = null;
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
    let api: ReturnType<typeof useAppleHealthBodyBackfill> | null = null;
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
