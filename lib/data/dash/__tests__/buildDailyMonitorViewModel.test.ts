import { buildDailyMonitorViewModel } from "../buildDailyMonitorViewModel";
import type { DailyMonitorPresenceStatus } from "../dailyMonitorPresence";

function domain(
  domainId:
    | "sleep"
    | "readiness"
    | "energy"
    | "nutrition"
    | "body_composition",
  presence: DailyMonitorPresenceStatus,
) {
  return { domainId, presence };
}

describe("buildDailyMonitorViewModel", () => {
  it("shows loading when all domains are unresolved", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: [
        domain("sleep", "loading_presence"),
        domain("readiness", "loading_presence"),
        domain("energy", "loading_presence"),
        domain("nutrition", "loading_presence"),
        domain("body_composition", "loading_presence"),
      ],
    });
    expect(vm.screenStatus).toBe("loading");
    expect(vm.visibleDomainIds).toEqual([]);
    expect(vm.sections).toEqual([]);
  });

  it("omits empty sections and keeps stable domain order", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: [
        domain("sleep", "present_complete"),
        domain("readiness", "absent_no_day_evidence"),
        domain("energy", "present_partial"),
        domain("nutrition", "absent_no_day_evidence"),
        domain("body_composition", "absent_no_day_evidence"),
      ],
    });
    expect(vm.screenStatus).toBe("ready");
    expect(vm.visibleDomainIds).toEqual(["sleep", "energy"]);
    expect(vm.sections.map((s) => s.id)).toEqual(["recovery", "movement_output"]);
    expect(vm.sections[0]?.domainIds).toEqual(["sleep"]);
    expect(vm.sections[1]?.domainIds).toEqual(["energy"]);
  });

  it("shows empty Monitor when all domains lack current-day evidence", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: [
        domain("sleep", "absent_no_day_evidence"),
        domain("readiness", "unavailable_source"),
        domain("energy", "absent_no_day_evidence"),
        domain("nutrition", "absent_no_day_evidence"),
        domain("body_composition", "absent_no_day_evidence"),
      ],
    });
    expect(vm.screenStatus).toBe("empty");
    expect(vm.emptyTitle).toMatch(/No health data is available for today/i);
    expect(vm.visibleDomainIds).toEqual([]);
  });

  it("shows partial refresh banner when cards are present and some domains erred", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: [
        domain("sleep", "present_complete"),
        domain("readiness", "screen_level_error"),
        domain("energy", "absent_no_day_evidence"),
        domain("nutrition", "absent_no_day_evidence"),
        domain("body_composition", "absent_no_day_evidence"),
      ],
    });
    expect(vm.screenStatus).toBe("partial_refresh");
    expect(vm.showPartialRefreshBanner).toBe(true);
    expect(vm.visibleDomainIds).toEqual(["sleep"]);
  });

  it("shows full error when every domain failed", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: [
        domain("sleep", "screen_level_error"),
        domain("readiness", "screen_level_error"),
        domain("energy", "screen_level_error"),
        domain("nutrition", "screen_level_error"),
        domain("body_composition", "screen_level_error"),
      ],
    });
    expect(vm.screenStatus).toBe("error");
    expect(vm.errorMessage).toBeTruthy();
  });
});
