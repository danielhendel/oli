import {
  replaceSleepDayFromCalendarPick,
  SLEEP_MAIN_SCREEN_PATHNAME,
} from "@/lib/ui/recovery/sleepCalendarDayNavigation";

describe("sleepCalendarDayNavigation", () => {
  it("replaces Sleep route with chosen day param", () => {
    const replace = jest.fn();
    replaceSleepDayFromCalendarPick({ replace }, "2026-08-15");
    expect(replace).toHaveBeenCalledWith({
      pathname: SLEEP_MAIN_SCREEN_PATHNAME,
      params: { day: "2026-08-15" },
    });
  });
});
