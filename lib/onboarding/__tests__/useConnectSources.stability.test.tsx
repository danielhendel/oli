/**
 * Regression: physical redbox — maximum update depth in useConnectSources.
 * Presence wrappers with unstable identity must not trigger unbounded setState.
 */

import React from "react";
import { act, create } from "react-test-renderer";

import { OPENING_COPY, ABOUT_YOU_COPY, CONNECT_COPY } from "../constants";

const mockRefetch = jest.fn(async () => undefined);
let mockPresence: {
  status: "partial" | "ready" | "error";
  data?: { connected: boolean };
  refetch: typeof mockRefetch;
} = {
  status: "ready",
  data: { connected: false },
  refetch: mockRefetch,
};

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: jest.fn(async () => "token"),
  }),
}));

jest.mock("@/lib/data/useOuraPresence", () => ({
  useOuraPresence: () => {
    // New wrapper object every call — previously caused the infinite loop.
    return { ...mockPresence, refetch: mockRefetch };
  },
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    refresh: jest.fn(async () => undefined),
    state: { status: "ready", profile: null },
  }),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: jest.fn(async () => false),
  getAppleHealthNotAvailable: jest.fn(async () => false),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("@/lib/api/oura", () => ({
  getOuraConnectUrl: jest.fn(),
}));

jest.mock("../appleHealthOnboardingConnect", () => ({
  connectAppleHealthForOnboarding: jest.fn(),
}));

jest.mock("../advanceOnboardingStep", () => ({
  markOnboardingUnderstand: jest.fn(async () => ({
    ok: true,
    json: {},
    status: 200,
    requestId: null,
  })),
}));

import { useConnectSources } from "../useConnectSources";
import { markOnboardingUnderstand } from "../advanceOnboardingStep";
import { connectAppleHealthForOnboarding } from "../appleHealthOnboardingConnect";
import { getOuraConnectUrl } from "@/lib/api/oura";

function Probe({ onRender }: { onRender: (v: ReturnType<typeof useConnectSources>) => void }) {
  const v = useConnectSources();
  onRender(v);
  return null;
}

describe("useConnectSources stability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPresence = {
      status: "ready",
      data: { connected: false },
      refetch: mockRefetch,
    };
  });

  it("does not enter a maximum-update-depth loop when presence wrappers are unstable", async () => {
    let latest: ReturnType<typeof useConnectSources> | null = null;
    let renders = 0;

    await act(async () => {
      create(
        <Probe
          onRender={(v) => {
            renders += 1;
            latest = v;
          }}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renders).toBeLessThan(20);
    expect(latest?.oura.status).toBe("idle");
    expect(latest?.apple.status === "idle" || latest?.apple.status === "unavailable").toBe(true);
  });

  it("updates Oura card when presence transitions to connected", async () => {
    let latest: ReturnType<typeof useConnectSources> | null = null;
    let tree: ReturnType<typeof create> | undefined;

    await act(async () => {
      tree = create(
        <Probe
          onRender={(v) => {
            latest = v;
          }}
        />,
      );
      await Promise.resolve();
    });

    expect(latest?.oura.status).toBe("idle");

    mockPresence = {
      status: "ready",
      data: { connected: true },
      refetch: mockRefetch,
    };

    await act(async () => {
      tree!.update(
        <Probe
          onRender={(v) => {
            latest = v;
          }}
        />,
      );
      await Promise.resolve();
    });

    expect(latest?.oura.status).toBe("connected");
  });

  it("Continue with no source advances once without connecting Apple Health or Oura", async () => {
    let latest: ReturnType<typeof useConnectSources> | null = null;

    await act(async () => {
      create(
        <Probe
          onRender={(v) => {
            latest = v;
          }}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      const p1 = latest!.continueNext();
      const p2 = latest!.continueNext();
      await Promise.all([p1, p2]);
    });

    expect(markOnboardingUnderstand).toHaveBeenCalledTimes(1);
    expect(connectAppleHealthForOnboarding).not.toHaveBeenCalled();
    expect(getOuraConnectUrl).not.toHaveBeenCalled();
  });

  it("I’ll do this later advances once without source actions", async () => {
    let latest: ReturnType<typeof useConnectSources> | null = null;

    await act(async () => {
      create(
        <Probe
          onRender={(v) => {
            latest = v;
          }}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      const p1 = latest!.skipForLater();
      const p2 = latest!.skipForLater();
      await Promise.all([p1, p2]);
    });

    expect(markOnboardingUnderstand).toHaveBeenCalledTimes(1);
    expect(connectAppleHealthForOnboarding).not.toHaveBeenCalled();
    expect(getOuraConnectUrl).not.toHaveBeenCalled();
  });
});

describe("Stage 2 approved copy locks", () => {
  it("locks Opening copy", () => {
    expect(OPENING_COPY.headline).toBe("Pursue Health Excellence.");
    expect([...OPENING_COPY.lines]).toEqual([
      "Know where you are.",
      "Know what to do.",
      "Discover how great you can become.",
    ]);
    expect(OPENING_COPY.headline).not.toBe("Pursue Excellence.");
  });

  it("removes About You explanatory subtitle", () => {
    expect("subtitle" in ABOUT_YOU_COPY).toBe(false);
    expect(ABOUT_YOU_COPY.title).toBe("Let’s get to know you.");
  });

  it("locks Connect later CTA", () => {
    expect(CONNECT_COPY.laterCta).toBe("I’ll do this later");
    expect(CONNECT_COPY.continueCta).toBe("Continue");
  });
});
