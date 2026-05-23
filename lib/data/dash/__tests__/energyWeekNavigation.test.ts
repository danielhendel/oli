import { describe, expect, it } from "@jest/globals";

import { computeEnergyWeekNavigationState } from "@/lib/data/dash/energyWeekNavigation";
import {
  addCalendarDaysToDayKey,
  getWeekDaysForAnchor,
  getWeekStartSunday,
} from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const today = "2026-05-20" as DayKey;
const currentWeekStart = getWeekStartSunday(today);
const previousWeekStart = addCalendarDaysToDayKey(currentWeekStart, -7);
const twoWeeksBackStart = addCalendarDaysToDayKey(currentWeekStart, -14);

describe("computeEnergyWeekNavigationState", () => {
  it("canonicalizes weekAnchorDay to the Sunday week-start", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: today,
    });
    expect(state.weekAnchorDay).toBe(currentWeekStart);
    expect(state.weekStart).toBe(currentWeekStart);
    expect(state.weekEnd).toBe(addCalendarDaysToDayKey(currentWeekStart, 6));
  });

  it("returns 7 sequential weekDayKeys Sunday\u2013Saturday matching getWeekDaysForAnchor", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: previousWeekStart,
    });
    expect(state.weekDayKeys).toEqual(getWeekDaysForAnchor(previousWeekStart));
    expect(state.weekDayKeys).toHaveLength(7);
  });

  it("disables Next on the current week and blocks future-week navigation", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: today,
    });
    expect(state.isCurrentWeek).toBe(true);
    expect(state.canGoNext).toBe(false);
    expect(state.nextWeekAnchor).toBeNull();
  });

  it("enables Next after navigating back, and nextWeekAnchor points to the next Sunday", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: previousWeekStart,
    });
    expect(state.isCurrentWeek).toBe(false);
    expect(state.canGoNext).toBe(true);
    expect(state.nextWeekAnchor).toBe(currentWeekStart);
  });

  it("stepping Next from the previous week lands on the current week and re-disables Next", () => {
    const back = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: previousWeekStart,
    });
    expect(back.nextWeekAnchor).not.toBeNull();
    const stepped = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: back.nextWeekAnchor!,
    });
    expect(stepped.isCurrentWeek).toBe(true);
    expect(stepped.canGoNext).toBe(false);
    expect(stepped.nextWeekAnchor).toBeNull();
  });

  it("previousWeekAnchor always points 7 days before the current weekStart and Previous is always enabled", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: currentWeekStart,
    });
    expect(state.canGoPrevious).toBe(true);
    expect(state.previousWeekAnchor).toBe(addCalendarDaysToDayKey(currentWeekStart, -7));
    const back = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: previousWeekStart,
    });
    expect(back.previousWeekAnchor).toBe(twoWeeksBackStart);
  });

  it("weekRangeLabel uses the compact same-month form when the week stays inside one month", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: "2026-05-20" as DayKey,
      weekAnchorDay: "2026-05-20" as DayKey,
    });
    expect(state.weekRangeLabel).toBe("May 17\u201323");
  });

  it("weekRangeLabel uses the cross-month form when the week straddles a month boundary", () => {
    const state = computeEnergyWeekNavigationState({
      todayDayKey: "2026-06-06" as DayKey,
      weekAnchorDay: "2026-06-03" as DayKey,
    });
    expect(state.weekRangeLabel).toBe("May 31\u2013Jun 6");
  });

  it("Sunday's weekAnchorDay equals its own weekStart (idempotent)", () => {
    const sunday = currentWeekStart;
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: sunday,
    });
    expect(state.weekStart).toBe(sunday);
    expect(state.weekDayKeys[0]).toBe(sunday);
  });

  it("anchor inside the current week still resolves to the current week (canGoNext=false)", () => {
    // Today is Wed 2026-05-20; weekAnchorDay set to the Friday of the same week.
    const stillThisWeek = addCalendarDaysToDayKey(currentWeekStart, 5);
    const state = computeEnergyWeekNavigationState({
      todayDayKey: today,
      weekAnchorDay: stillThisWeek,
    });
    expect(state.weekStart).toBe(currentWeekStart);
    expect(state.canGoNext).toBe(false);
  });
});
