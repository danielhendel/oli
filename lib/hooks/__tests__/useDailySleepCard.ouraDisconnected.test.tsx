import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { getSleepNight } from "@/lib/api/usersMe";
import { useDailySleepCard } from "@/lib/hooks/useDailySleepCard";
import { __resetSleepTodayRecoveryLedgerForTests } from "@/lib/data/sleep/runSleepTodayRecoveryIfMissing";

const DAY = "2026-05-26";

const mockPostOuraSleepDayRefresh = jest.fn();
jest.mock("@/lib/api/ouraSleepDayRefresh", () => ({
  postOuraSleepDayRefresh: (...args: unknown[]) =>
    mockPostOuraSleepDayRefresh(...args),
}));

const mockUseOuraPresence = jest.fn();
jest.mock("@/lib/data/useOuraPresence", () => ({
  useOuraPresence: () => mockUseOuraPresence(),
}));

const mockUseAuth = jest.fn();
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getSleepNight: jest.fn(),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => DAY,
}));

const getSleepNightMock = getSleepNight as jest.MockedFunction<typeof getSleepNight>;

function Probe({ day }: { day: string }) {
  const { vm } = useDailySleepCard(day);
  if (vm.status !== "missing") {
    return <Text testID="out">{vm.status}</Text>;
  }
  return (
    <Text testID="out">
      {vm.status}|{vm.reason ?? "none"}|{vm.message}
    </Text>
  );
}

describe("useDailySleepCard — ouraDisconnected", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSleepTodayRecoveryLedgerForTests();
    mockPostOuraSleepDayRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: { ok: true, requestId: "r1", day: DAY, pullNowStatus: 202 },
    });
    mockUseAuth.mockReturnValue({
      user: { uid: "user-a" },
      initializing: false,
      getIdToken: jest.fn(async () => "tok"),
    });
    getSleepNightMock.mockResolvedValue({
      ok: false,
      status: 404,
      requestId: null,
      error: "not found",
      kind: "http",
    } as never);
  });

  it("sets reason oura_disconnected when presence is ready and not connected", async () => {
    mockUseOuraPresence.mockReturnValue({
      status: "ready",
      data: { connected: false, lastSyncAt: null },
      refetch: jest.fn(),
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={DAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const out = String(root.root.findByProps({ testID: "out" }).props.children);
    expect(out).toContain("oura_disconnected");
    expect(out).toContain("Reconnect Oura to sync your sleep.");
  });

  it("does not set oura_disconnected while presence is partial", async () => {
    mockUseOuraPresence.mockReturnValue({
      status: "partial",
      refetch: jest.fn(),
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={DAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const out = String(root.root.findByProps({ testID: "out" }).props.children);
    expect(out).not.toContain("oura_disconnected");
  });

  it("does not set oura_disconnected when presence is error (transient)", async () => {
    mockUseOuraPresence.mockReturnValue({
      status: "error",
      error: "Server error",
      requestId: null,
      refetch: jest.fn(),
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={DAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const out = String(root.root.findByProps({ testID: "out" }).props.children);
    expect(out).not.toContain("oura_disconnected");
    expect(out).toContain("no_data");
  });

  it("uses no_data when connected but sleep is missing", async () => {
    mockUseOuraPresence.mockReturnValue({
      status: "ready",
      data: { connected: true, lastSyncAt: "2026-05-25T08:00:00.000Z" },
      refetch: jest.fn(),
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={DAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const out = String(root.root.findByProps({ testID: "out" }).props.children);
    expect(out).toContain("no_data");
    expect(out).not.toContain("oura_disconnected");
    expect(out).toContain("No sleep data logged");
  });
});
