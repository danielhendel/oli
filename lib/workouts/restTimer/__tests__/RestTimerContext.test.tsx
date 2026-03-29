/**
 * Rest timer context: state transitions, pause/resume/reset/stop, dismissed vs active.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import { RestTimerProvider, useRestTimer } from "../RestTimerContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../restTimerStorage", () => ({
  getLastRestTimerDurationSec: jest.fn().mockResolvedValue(null),
  setLastRestTimerDurationSec: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../haptic", () => ({
  playCompletionHaptic: jest.fn(),
}));

function TestConsumer({
  onState,
}: {
  onState: (s: {
    status: string;
    remainingMs: number;
    panelVisible: boolean;
  }) => void;
}) {
  const ctx = useRestTimer();
  React.useEffect(() => {
    onState({
      status: ctx.status,
      remainingMs: ctx.remainingMs,
      panelVisible: ctx.panelVisible,
    });
  }, [ctx.status, ctx.remainingMs, ctx.panelVisible, onState]);
  return null;
}

describe("RestTimerContext", () => {
  let mounted: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    jest.useFakeTimers();
  });
  afterEach(() => {
    const t = mounted;
    mounted = null;
    if (t != null) {
      act(() => {
        t.unmount();
      });
    }
    jest.useRealTimers();
  });

  it("starts idle with panel not visible", () => {
    let state: { status: string; remainingMs: number; panelVisible: boolean } = {
      status: "",
      remainingMs: -1,
      panelVisible: true,
    };
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <TestConsumer
            onState={(s) => {
              state = s;
            }}
          />
        </RestTimerProvider>,
      );
    });
    expect(state.status).toBe("idle");
    expect(state.remainingMs).toBe(0);
    expect(state.panelVisible).toBe(false);
  });

  it("start sets running and remaining time", () => {
    let state: { status: string; remainingMs: number; panelVisible: boolean } = {
      status: "",
      remainingMs: -1,
      panelVisible: false,
    };
    let startFn: (ms: number) => void = () => undefined;
    function Consumer() {
      const ctx = useRestTimer();
      startFn = ctx.start;
      React.useEffect(() => {
        state = { status: ctx.status, remainingMs: ctx.remainingMs, panelVisible: ctx.panelVisible };
      }, [ctx.status, ctx.remainingMs, ctx.panelVisible]);
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      startFn(60_000);
    });
    expect(state.status).toBe("running");
    expect(state.remainingMs).toBeLessThanOrEqual(60_000);
    expect(state.remainingMs).toBeGreaterThan(59_000);
    expect(state.panelVisible).toBe(true);
  });

  it("setPanelVisible(false) does not stop timer", () => {
    let ctxCapture: ReturnType<typeof useRestTimer> | null = null;
    function Consumer() {
      ctxCapture = useRestTimer();
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      ctxCapture!.start(60_000);
    });
    expect(ctxCapture!.status).toBe("running");
    act(() => {
      ctxCapture!.setPanelVisible(false);
    });
    expect(ctxCapture!.status).toBe("running");
    expect(ctxCapture!.panelVisible).toBe(false);
  });

  it("pause sets status to paused and keeps remaining", () => {
    let ctxCapture: ReturnType<typeof useRestTimer> | null = null;
    function Consumer() {
      ctxCapture = useRestTimer();
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      ctxCapture!.start(60_000);
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    act(() => {
      ctxCapture!.pause();
    });
    expect(ctxCapture!.status).toBe("paused");
    expect(ctxCapture!.remainingMs).toBe(50_000);
  });

  it("resume continues from paused remaining", () => {
    let ctxCapture: ReturnType<typeof useRestTimer> | null = null;
    function Consumer() {
      ctxCapture = useRestTimer();
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      ctxCapture!.start(60_000);
    });
    act(() => {
      ctxCapture!.pause();
    });
    const remainingWhenPaused = ctxCapture!.remainingMs;
    act(() => {
      ctxCapture!.resume();
    });
    expect(ctxCapture!.status).toBe("running");
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(ctxCapture!.remainingMs).toBeLessThanOrEqual(remainingWhenPaused - 900);
  });

  it("stop sets status to idle", () => {
    let ctxCapture: ReturnType<typeof useRestTimer> | null = null;
    function Consumer() {
      ctxCapture = useRestTimer();
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      ctxCapture!.start(60_000);
    });
    act(() => {
      ctxCapture!.stop();
    });
    expect(ctxCapture!.status).toBe("idle");
    expect(ctxCapture!.remainingMs).toBe(0);
    expect(ctxCapture!.panelVisible).toBe(false);
  });

  it("countdown reaches finished and fires haptic", () => {
    const { playCompletionHaptic } = require("../haptic");
    let ctxCapture: ReturnType<typeof useRestTimer> | null = null;
    function Consumer() {
      ctxCapture = useRestTimer();
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      ctxCapture!.start(2000);
    });
    expect(ctxCapture!.status).toBe("running");
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(ctxCapture!.status).toBe("finished");
    expect(playCompletionHaptic).toHaveBeenCalled();
  });

  it("reset from finished restarts run", () => {
    let ctxCapture: ReturnType<typeof useRestTimer> | null = null;
    function Consumer() {
      ctxCapture = useRestTimer();
      return null;
    }
    act(() => {
      mounted = renderer.create(
        <RestTimerProvider>
          <Consumer />
        </RestTimerProvider>,
      );
    });
    act(() => {
      ctxCapture!.start(5000);
    });
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(ctxCapture!.status).toBe("finished");
    act(() => {
      ctxCapture!.reset();
    });
    expect(ctxCapture!.status).toBe("running");
    expect(ctxCapture!.remainingMs).toBeLessThanOrEqual(5000);
  });
});
