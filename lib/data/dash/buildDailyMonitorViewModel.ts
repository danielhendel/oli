/**
 * Pure Daily Monitor screen view-model builder (Phase 2C).
 * No React Native / Firebase imports.
 */

import {
  DAILY_MONITOR_DOMAIN_ORDER,
  DAILY_MONITOR_DOMAIN_SECTION,
  DAILY_MONITOR_SECTION_ORDER,
  DAILY_MONITOR_SECTION_TITLES,
  presenceCreatesMainStackCard,
  type DailyMonitorDomainId,
  type DailyMonitorPresenceStatus,
  type DailyMonitorSectionId,
} from "@/lib/data/dash/dailyMonitorPresence";
import type { DayKey } from "@/lib/ui/calendar/types";

export type DailyMonitorDomainPresenceInput = {
  domainId: DailyMonitorDomainId;
  presence: DailyMonitorPresenceStatus;
};

export type DailyMonitorScreenStatus =
  | "loading"
  | "ready"
  | "empty"
  | "partial_refresh"
  | "error"
  | "signed_out";

export type DailyMonitorSectionModel = {
  id: DailyMonitorSectionId;
  title: string;
  domainIds: DailyMonitorDomainId[];
};

export type DailyMonitorViewModel = {
  requestedDay: DayKey;
  /** Consumer date line for the header (preformatted). */
  dateLabel: string;
  screenStatus: DailyMonitorScreenStatus;
  sections: DailyMonitorSectionModel[];
  /** Domains that should mount cards, stable order. */
  visibleDomainIds: DailyMonitorDomainId[];
  showPartialRefreshBanner: boolean;
  emptyTitle: string | null;
  emptySubtitle: string | null;
  errorMessage: string | null;
};

export type BuildDailyMonitorViewModelInput = {
  requestedDay: DayKey;
  dateLabel: string;
  signedOut: boolean;
  domains: readonly DailyMonitorDomainPresenceInput[];
};

function presenceByDomain(
  domains: readonly DailyMonitorDomainPresenceInput[],
): Map<DailyMonitorDomainId, DailyMonitorPresenceStatus> {
  const map = new Map<DailyMonitorDomainId, DailyMonitorPresenceStatus>();
  for (const d of domains) map.set(d.domainId, d.presence);
  return map;
}

export function buildDailyMonitorViewModel(
  input: BuildDailyMonitorViewModelInput,
): DailyMonitorViewModel {
  if (input.signedOut) {
    return {
      requestedDay: input.requestedDay,
      dateLabel: input.dateLabel,
      screenStatus: "signed_out",
      sections: [],
      visibleDomainIds: [],
      showPartialRefreshBanner: false,
      emptyTitle: null,
      emptySubtitle: null,
      errorMessage: null,
    };
  }

  const byDomain = presenceByDomain(input.domains);
  const statuses = DAILY_MONITOR_DOMAIN_ORDER.map(
    (id) => byDomain.get(id) ?? "absent_no_day_evidence",
  );

  const allLoading = statuses.every((s) => s === "loading_presence");
  const anyLoading = statuses.some((s) => s === "loading_presence");
  const visibleDomainIds = DAILY_MONITOR_DOMAIN_ORDER.filter((id) => {
    const p = byDomain.get(id);
    return p != null && presenceCreatesMainStackCard(p);
  });

  const anyError = statuses.some(
    (s) => s === "screen_level_error" || s === "refresh_error_with_cached_day_evidence",
  );
  const allTerminalAbsentOrUnavailable = statuses.every(
    (s) =>
      s === "absent_no_day_evidence" ||
      s === "unavailable_source" ||
      s === "screen_level_error",
  );
  const allFailed =
    statuses.every((s) => s === "screen_level_error") && !anyLoading;

  let screenStatus: DailyMonitorScreenStatus;
  let emptyTitle: string | null = null;
  let emptySubtitle: string | null = null;
  let errorMessage: string | null = null;
  let showPartialRefreshBanner = false;

  if (allLoading || (anyLoading && visibleDomainIds.length === 0)) {
    screenStatus = "loading";
  } else if (allFailed) {
    screenStatus = "error";
    errorMessage = "Couldn't load today's health data. Please try again.";
  } else if (visibleDomainIds.length === 0 && allTerminalAbsentOrUnavailable && !anyLoading) {
    screenStatus = "empty";
    emptyTitle = "No health data is available for today yet.";
    emptySubtitle = "Data will appear as devices sync or you add entries.";
  } else {
    screenStatus = "ready";
    if (anyError && visibleDomainIds.length > 0) {
      showPartialRefreshBanner = true;
      screenStatus = "partial_refresh";
    }
  }

  const sections: DailyMonitorSectionModel[] = [];
  for (const sectionId of DAILY_MONITOR_SECTION_ORDER) {
    const domainIds = visibleDomainIds.filter(
      (id) => DAILY_MONITOR_DOMAIN_SECTION[id] === sectionId,
    );
    if (domainIds.length === 0) continue;
    sections.push({
      id: sectionId,
      title: DAILY_MONITOR_SECTION_TITLES[sectionId],
      domainIds,
    });
  }

  return {
    requestedDay: input.requestedDay,
    dateLabel: input.dateLabel,
    screenStatus,
    sections,
    visibleDomainIds,
    showPartialRefreshBanner,
    emptyTitle,
    emptySubtitle,
    errorMessage,
  };
}
