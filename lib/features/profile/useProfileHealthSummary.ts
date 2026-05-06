// lib/features/profile/useProfileHealthSummary.ts
// Composes DailyFacts + labs + uploads + failures for Profile digital twin cards (no Firebase in UI).
// Heavy queries are gated to the focused Profile tab so Dash/Activity are not contending by default.

import { useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useLabResults } from "@/lib/data/useLabResults";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import type { MetricDataContext } from "@/lib/metrics/metricDisplay";
import { HEALTH_RECORD_CATEGORIES } from "@/lib/features/profile/healthRecordCategories";
import {
  FALLBACK_MISSING,
  FALLBACK_NONE,
  FALLBACK_NO_DATA,
  FALLBACK_NO_UPLOADS,
  getCategoryBaselineLabel,
  getHealthRecordCategorySubtitle,
  type HealthSubtitleHooks,
} from "@/lib/features/profile/profileHealthSubtitle";
import { getSupportedMetricCoverage } from "@/lib/features/profile/profileMetricCoverage";
import type { ProfileDigitalTwinCategoryVm } from "@/lib/features/profile/profileDigitalTwinVm";
import type { DailyFactsDto } from "@/lib/contracts";
import type { HealthRecordCategory } from "@/lib/features/profile/healthRecordCategories";

function getRange90Days(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function buildSubtitleHooks(
  dailyFacts: {
    status: string;
    data?: unknown;
  },
  labResults: { status: string; data?: unknown },
  uploads: { status: string; data?: unknown },
  failures: { status: string; data?: unknown },
): HealthSubtitleHooks {
  return {
    dailyFacts:
      dailyFacts.status === "error"
        ? { status: "error" }
        : dailyFacts.status === "ready"
          ? { status: "ready", data: dailyFacts.data as DailyFactsDto }
          : { status: dailyFacts.status === "missing" ? "missing" : "partial" },
    labResults: {
      status: labResults.status,
      ...(labResults.data !== undefined
        ? { data: labResults.data as { items: unknown[] } }
        : {}),
    },
    uploads: {
      status: uploads.status,
      ...(uploads.data !== undefined ? { data: uploads.data as { count: number } } : {}),
    },
    failures: {
      status: failures.status,
      ...(failures.data !== undefined
        ? { data: failures.data as { items: unknown[] } }
        : {}),
    },
  };
}

function dataStatusFrom(
  recordState: import("@/lib/features/profile/healthRecordCategories").RecordState,
  subtitleLine: string,
): string {
  if (recordState === "Missing") return "Needs setup";
  if (recordState === "Partial") return "Partial";
  if (subtitleLine === "—") return "Unavailable";
  if (subtitleLine === FALLBACK_NONE) return "Logged";
  if (subtitleLine === FALLBACK_NO_DATA || subtitleLine === FALLBACK_NO_UPLOADS) {
    return "No data yet";
  }
  if (subtitleLine === FALLBACK_MISSING) return "Needs setup";
  return "Logged";
}

function emptyDetailFor(cat: HealthRecordCategory, subtitle: string): string {
  if (cat.route) {
    if (subtitle === FALLBACK_NO_DATA || subtitle === FALLBACK_NO_UPLOADS) {
      return "Open the category to add data or connect sources.";
    }
    return "";
  }
  if (cat.recordState === "Missing") {
    return "This area is not available in Oli yet.";
  }
  return "No navigation target yet for this category.";
}

export type ProfileHealthSummaryResult = {
  categories: ProfileDigitalTwinCategoryVm[];
  /** One-line coverage when any category has logged data. */
  coverageSummaryLine: string | null;
  /** Signed out — digital twin section should explain sign-in. */
  signedOut: boolean;
};

const LAB_LIMIT = 50;
const FAILURES_PAGE_LIMIT = 200;

export function useProfileHealthSummary(): ProfileHealthSummaryResult {
  const { user, initializing } = useAuth();
  const isFocused = useIsFocused();
  const profileDataEnabled = isFocused;

  const day = useMemo(() => getTodayDayKey(), []);
  const range = useMemo(() => getRange90Days(), []);

  const failuresArgs = useMemo(
    () => ({
      start: range.start,
      end: range.end,
      limit: FAILURES_PAGE_LIMIT,
    }),
    [range.start, range.end],
  );

  const labOpts = useMemo(
    () => ({ limit: LAB_LIMIT, enabled: profileDataEnabled }),
    [profileDataEnabled],
  );

  const uploadsOpts = useMemo(() => ({ enabled: profileDataEnabled }), [profileDataEnabled]);

  const failuresOpts = useMemo(
    () => ({ mode: "page" as const, enabled: profileDataEnabled }),
    [profileDataEnabled],
  );

  const dailyFacts = useDailyFacts(day, { enabled: profileDataEnabled });
  const labResults = useLabResults(labOpts);
  const uploads = useUploadsPresence(uploadsOpts);
  const failures = useFailuresRange(failuresArgs, failuresOpts);

  const metricContext: MetricDataContext = useMemo(
    () => ({
      dailyFacts: {
        status: dailyFacts.status,
        data: dailyFacts.status === "ready" ? dailyFacts.data : undefined,
      },
      labResults: {
        status: labResults.status,
        data: labResults.status === "ready" ? labResults.data : undefined,
      },
      uploads: {
        status: uploads.status,
        data: uploads.status === "ready" ? uploads.data : undefined,
      },
      failures: {
        status: failures.status,
        data: failures.status === "ready" ? failures.data : undefined,
      },
    }),
    [dailyFacts, labResults, uploads, failures],
  );

  const subtitleHooks = useMemo(
    () =>
      buildSubtitleHooks(
        dailyFacts,
        labResults,
        uploads,
        failures,
      ),
    [dailyFacts, labResults, uploads, failures],
  );

  const categories = useMemo((): ProfileDigitalTwinCategoryVm[] => {
    return HEALTH_RECORD_CATEGORIES.map((cat) => {
      const subtitleLine = getHealthRecordCategorySubtitle(cat, subtitleHooks);
      const dataStatusLabel = dataStatusFrom(cat.recordState, subtitleLine);
      const { withData, totalSupported } = getSupportedMetricCoverage(cat.id, metricContext);
      const coverageLabel = totalSupported > 0 ? `${withData}/${totalSupported} metrics` : null;
      const baselineLabel = getCategoryBaselineLabel(cat.id, subtitleHooks.dailyFacts);
      const navigationHref = cat.route ?? null;

      return {
        category: cat,
        subtitleLine,
        dataStatusLabel,
        coverageLabel,
        baselineLabel,
        navigationHref,
        emptyDetail: emptyDetailFor(cat, subtitleLine),
      };
    });
  }, [subtitleHooks, metricContext]);

  const coverageSummaryLine = useMemo(() => {
    const logged = categories.filter((c) => c.dataStatusLabel === "Logged").length;
    if (logged === 0) return null;
    return `${logged} ${logged === 1 ? "area has" : "areas have"} data in today’s record`;
  }, [categories]);

  return {
    categories,
    coverageSummaryLine,
    signedOut: !initializing && user == null,
  };
}
