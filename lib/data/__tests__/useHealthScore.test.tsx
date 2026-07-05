import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { getHealthScore } from "@/lib/api/usersMe";
import { useHealthScore } from "@/lib/data/useHealthScore";

const mockGetIdToken = jest.fn().mockResolvedValue("token");

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getHealthScore: jest.fn(),
}));

const mockGetHealthScore = getHealthScore as jest.MockedFunction<typeof getHealthScore>;

function Harness(props: { enabled?: boolean; onStatus: (status: string) => void }) {
  const health = useHealthScore("2026-07-05", { enabled: props.enabled });
  const onStatus = useRef(props.onStatus);
  onStatus.current = props.onStatus;
  useEffect(() => {
    onStatus.current(health.status);
  }, [health.status]);
  return null;
}

async function flush() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useHealthScore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIdToken.mockResolvedValue("token");
  });

  it("does not call the API when enabled is false", async () => {
    let status = "partial";
    await act(async () => {
      renderer.create(<Harness enabled={false} onStatus={(s) => (status = s)} />);
    });
    await flush();
    expect(status).toBe("missing");
    expect(mockGetHealthScore).not.toHaveBeenCalled();
  });
});
