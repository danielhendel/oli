/**
 * Proves only one Dash experience host mounts for each flag combination.
 */

import React, { act } from "react";
import renderer from "react-test-renderer";

import { setDashDailyMonitorFoundationEnabledForTests } from "@/lib/data/dash/dashDailyMonitorFoundation";
import { setDashWeeklyProgressRelocationEnabledForTests } from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

const mockDailyMonitorHost = jest.fn(() => null);
const mockLegacyDashHost = jest.fn(() => null);

jest.mock("@/components/dashboard/DailyMonitorHost", () => ({
  DailyMonitorHost: () => mockDailyMonitorHost(),
}));

jest.mock("@/components/dashboard/LegacyDashHost", () => ({
  LegacyDashHost: () => mockLegacyDashHost(),
}));

jest.mock("@/lib/ui/ScreenStates", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require("react");
  return {
    ScreenContainer: ({ children }: { children: unknown }) =>
      R.createElement(R.Fragment, null, children),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DashScreen = require("../../../../app/(app)/(tabs)/dash").default;

describe("Dash experience host mounting", () => {
  afterEach(() => {
    setDashDailyMonitorFoundationEnabledForTests(null);
    setDashWeeklyProgressRelocationEnabledForTests(null);
    mockDailyMonitorHost.mockClear();
    mockLegacyDashHost.mockClear();
  });

  async function mountDash(): Promise<renderer.ReactTestRenderer> {
    // React may emit act() warnings for synchronous host mount bookkeeping; allow and flush.
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(DashScreen));
      await Promise.resolve();
    });
    return tree;
  }

  it("mounts Daily Monitor when both flags are enabled", async () => {
    setDashDailyMonitorFoundationEnabledForTests(true);
    setDashWeeklyProgressRelocationEnabledForTests(true);
    const tree = await mountDash();
    expect(mockDailyMonitorHost).toHaveBeenCalledTimes(1);
    expect(mockLegacyDashHost).not.toHaveBeenCalled();
    tree.unmount();
  });

  it("mounts legacy Dash when Daily Monitor is disabled", async () => {
    setDashDailyMonitorFoundationEnabledForTests(false);
    setDashWeeklyProgressRelocationEnabledForTests(true);
    const tree = await mountDash();
    expect(mockLegacyDashHost).toHaveBeenCalledTimes(1);
    expect(mockDailyMonitorHost).not.toHaveBeenCalled();
    tree.unmount();
  });

  it("falls back to legacy when Daily Monitor is on but relocation is off", async () => {
    setDashDailyMonitorFoundationEnabledForTests(true);
    setDashWeeklyProgressRelocationEnabledForTests(false);
    const tree = await mountDash();
    expect(mockLegacyDashHost).toHaveBeenCalledTimes(1);
    expect(mockDailyMonitorHost).not.toHaveBeenCalled();
    tree.unmount();
  });

  it("mounts legacy Dash when both flags are disabled", async () => {
    setDashDailyMonitorFoundationEnabledForTests(false);
    setDashWeeklyProgressRelocationEnabledForTests(false);
    const tree = await mountDash();
    expect(mockLegacyDashHost).toHaveBeenCalledTimes(1);
    expect(mockDailyMonitorHost).not.toHaveBeenCalled();
    tree.unmount();
  });
});
