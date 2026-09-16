/**
 * Home mounts domain map only; Today owns Daily Monitor.
 */

import fs from "node:fs";
import path from "node:path";

import React, { act } from "react";
import renderer from "react-test-renderer";

import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

const mockHomeScreenContent = jest.fn(() => null);
const mockDailyMonitorHost = jest.fn(() => null);

jest.mock("@/lib/ui/home/HomeScreenContent", () => ({
  HomeScreenContent: () => mockHomeScreenContent(),
}));

jest.mock("@/components/dashboard/DailyMonitorHost", () => ({
  DailyMonitorHost: () => mockDailyMonitorHost(),
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TodayScreen = require("../../../../app/(app)/(tabs)/today").default;

describe("Home and Today host mounting", () => {
  beforeEach(() => {
    mockHomeScreenContent.mockClear();
    mockDailyMonitorHost.mockClear();
  });

  it("Home mounts HomeScreenContent and not DailyMonitorHost", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(DashScreen));
      await Promise.resolve();
    });
    expect(mockHomeScreenContent).toHaveBeenCalledTimes(1);
    expect(mockDailyMonitorHost).not.toHaveBeenCalled();
    tree.unmount();
  });

  it("Today mounts DailyMonitorHost once", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(TodayScreen));
      await Promise.resolve();
    });
    expect(mockDailyMonitorHost).toHaveBeenCalledTimes(1);
    expect(mockHomeScreenContent).not.toHaveBeenCalled();
    tree.unmount();
  });

  it("Home source does not import DailyMonitorHost", () => {
    const homeSrc = fs.readFileSync(
      path.join(__dirname, "../../../../lib/ui/home/HomeScreenContent.tsx"),
      "utf8",
    );
    expect(homeSrc).not.toMatch(/DailyMonitorHost/);
    expect(homeSrc).not.toMatch(/useTodayHealthHero/);
    expect(homeSrc).not.toMatch(/useDailyReadinessCard/);
  });

  it("keeps Monitor-only domain hooks out of LegacyDashHost source", () => {
    const legacySrc = fs.readFileSync(
      path.join(__dirname, "../../../../components/dashboard/LegacyDashHost.tsx"),
      "utf8",
    );
    expect(legacySrc).not.toMatch(/useDailyMonitorActivityCard/);
    expect(legacySrc).not.toMatch(/useDailyMonitorSessionCards/);
    expect(legacySrc).not.toMatch(/useDailyMonitorStressCard/);
    expect(legacySrc).not.toMatch(/DailyMonitorDomainCards/);
  });
});
