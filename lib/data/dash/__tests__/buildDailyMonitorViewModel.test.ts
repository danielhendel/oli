import type { DailyMonitorDomainId, DailyMonitorPresenceStatus } from "../dailyMonitorPresence";
import { buildDailyMonitorViewModel } from "../buildDailyMonitorViewModel";

function domain(domainId: DailyMonitorDomainId, presence: DailyMonitorPresenceStatus) {
  return { domainId, presence };
}

function allDomains(presence: DailyMonitorPresenceStatus) {
  return (
    [
      "sleep",
      "readiness",
      "stress",
      "activity",
      "workout",
      "cardio",
      "energy",
      "nutrition",
      "body_composition",
    ] as const
  ).map((id) => domain(id, presence));
}

describe("buildDailyMonitorViewModel", () => {
  it("shows loading when all domains are unresolved", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: allDomains("loading_presence"),
    });
    expect(vm.screenStatus).toBe("loading");
    expect(vm.visibleDomainIds).toEqual([]);
    expect(vm.sections).toEqual([]);
  });

  it("omits empty sections and keeps stable domain order including new domains", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: [
        domain("sleep", "present_complete"),
        domain("readiness", "absent_no_day_evidence"),
        domain("stress", "present_complete"),
        domain("activity", "present_complete"),
        domain("workout", "present_complete"),
        domain("cardio", "absent_no_day_evidence"),
        domain("energy", "present_partial"),
        domain("nutrition", "absent_no_day_evidence"),
        domain("body_composition", "absent_no_day_evidence"),
      ],
    });
    expect(vm.screenStatus).toBe("ready");
    expect(vm.visibleDomainIds).toEqual(["sleep", "stress", "activity", "workout", "energy"]);
    expect(vm.sections.map((s) => s.id)).toEqual(["recovery", "movement_output"]);
    expect(vm.sections[0]?.domainIds).toEqual(["sleep", "stress"]);
    expect(vm.sections[1]?.domainIds).toEqual(["activity", "workout", "energy"]);
  });

  it("shows empty Monitor when all domains lack current-day evidence", () => {
    const vm = buildDailyMonitorViewModel({
      requestedDay: "2026-07-20",
      dateLabel: "Mon Jul 20, 2026",
      signedOut: false,
      domains: allDomains("absent_no_day_evidence"),
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
        domain("stress", "absent_no_day_evidence"),
        domain("activity", "absent_no_day_evidence"),
        domain("workout", "absent_no_day_evidence"),
        domain("cardio", "absent_no_day_evidence"),
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
      domains: allDomains("screen_level_error"),
    });
    expect(vm.screenStatus).toBe("error");
    expect(vm.errorMessage).toBeTruthy();
  });
});
