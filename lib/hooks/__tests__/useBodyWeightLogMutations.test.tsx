import React from "react";
import renderer, { act } from "react-test-renderer";

const mockDeleteIngestedRawEventAuthed = jest.fn();
const mockLogWeight = jest.fn();

jest.mock("@/lib/api/ingest", () => ({
  deleteIngestedRawEventAuthed: (...args: unknown[]) => mockDeleteIngestedRawEventAuthed(...args),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logWeight: (...args: unknown[]) => mockLogWeight(...args),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ getIdToken: async () => "token" }),
}));

jest.mock("@/lib/navigation/refreshBus", () => ({
  emitRefresh: jest.fn(),
}));

import { useBodyWeightLogMutations } from "@/lib/hooks/useBodyWeightLogMutations";

describe("useBodyWeightLogMutations", () => {
  let mutations!: ReturnType<typeof useBodyWeightLogMutations>;

  function Harness() {
    mutations = useBodyWeightLogMutations();
    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogWeight.mockResolvedValue({ ok: true });
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({ ok: true, suppressionWritten: true });
  });

  it("edit imported weight creates manual replacement then suppresses original", async () => {
    await act(async () => {
      renderer.create(<Harness />);
      await Promise.resolve();
    });

    await act(async () => {
      const res = await mutations.updateEntry({
        rawEventId: "appleHealth:v2:bodyWeight:2026-06-06T14:30:00.000Z_apple_watch",
        observedAtIso: "2026-06-06T14:30:00.000Z",
        weightLbs: 160.2,
        timezone: "America/New_York",
      });
      expect(res.ok).toBe(true);
    });

    expect(mockLogWeight).toHaveBeenCalledTimes(1);
    expect(mockDeleteIngestedRawEventAuthed).toHaveBeenCalledTimes(1);
    expect(mockDeleteIngestedRawEventAuthed).toHaveBeenCalledWith(
      "appleHealth:v2:bodyWeight:2026-06-06T14:30:00.000Z_apple_watch",
      "token",
    );
  });

  it("manual delete removes entry without requiring suppression", async () => {
    await act(async () => {
      renderer.create(<Harness />);
      await Promise.resolve();
    });

    await act(async () => {
      const res = await mutations.deleteEntry("manual_weight_1");
      expect(res.ok).toBe(true);
    });

    expect(mockDeleteIngestedRawEventAuthed).toHaveBeenCalledWith("manual_weight_1", "token");
  });
});
