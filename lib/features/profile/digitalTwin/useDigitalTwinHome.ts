// lib/features/profile/digitalTwin/useDigitalTwinHome.ts
// Composition hook: wires existing read-only data hooks into a TwinDataContext and
// builds the Digital Twin Home view model. No Firebase, no on-device scoring here —
// the heavy lifting stays server-side; this only composes server truths.

import { useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { useHealthScore } from "@/lib/data/useHealthScore";
import { useHealthSignals } from "@/lib/data/useHealthSignals";
import { useInsights } from "@/lib/data/useInsights";
import { useIntelligenceContext } from "@/lib/data/useIntelligenceContext";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useLabResults } from "@/lib/data/useLabResults";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { buildDigitalTwinHomeVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinHomeVm";
import type {
  DigitalTwinHomeVm,
  TwinDataContext,
} from "@/lib/features/profile/digitalTwin/types";

function getRange90Days(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export type UseDigitalTwinHomeResult = {
  vm: DigitalTwinHomeVm;
  ctx: TwinDataContext;
  loading: boolean;
  signedOut: boolean;
  refetch: () => void;
};

export function useDigitalTwinHome(): UseDigitalTwinHomeResult {
  const { user, initializing } = useAuth();
  const { state: prefState } = usePreferences();
  const { state: profileState } = useUserProfileMain();
  const isFocused = useIsFocused();
  const enabled = isFocused;

  const day = useMemo(() => getTodayDayKey(), []);
  const range = useMemo(() => getRange90Days(), []);

  const failuresArgs = useMemo(
    () => ({ start: range.start, end: range.end, limit: 200 }),
    [range.start, range.end],
  );
  const labOpts = useMemo(() => ({ limit: 50, enabled }), [enabled]);
  const uploadsOpts = useMemo(() => ({ enabled }), [enabled]);
  const failuresOpts = useMemo(() => ({ mode: "page" as const, enabled }), [enabled]);

  const healthScore = useHealthScore(day);
  const healthSignals = useHealthSignals(day);
  const insights = useInsights(day);
  const intelligence = useIntelligenceContext(day);
  const dailyFacts = useDailyFacts(day, { enabled });
  const labs = useLabResults(labOpts);
  const uploads = useUploadsPresence(uploadsOpts);
  const failures = useFailuresRange(failuresArgs, failuresOpts);

  const signedOut = !initializing && user == null;
  const massUnit = prefState.preferences.units.mass;
  const profile = "profile" in profileState ? profileState.profile : null;
  const lengthUnit = profile?.app.preferredUnits.length ?? "cm";

  const ctx: TwinDataContext = useMemo(() => {
    return {
      healthScore:
        healthScore.status === "ready"
          ? { status: "ready", data: healthScore.data }
          : { status: healthScore.status },
      healthSignals:
        healthSignals.status === "ready"
          ? { status: "ready", data: healthSignals.data }
          : { status: healthSignals.status },
      insights:
        insights.status === "ready"
          ? { status: "ready", data: insights.data }
          : { status: insights.status },
      intelligence:
        intelligence.status === "ready"
          ? { status: "ready", data: intelligence.data }
          : { status: intelligence.status },
      dailyFacts:
        dailyFacts.status === "ready"
          ? { status: "ready", data: dailyFacts.data }
          : { status: dailyFacts.status },
      profile,
      labs:
        labs.status === "ready" ? { status: "ready", data: labs.data } : { status: labs.status },
      uploads:
        uploads.status === "ready"
          ? { status: "ready", data: uploads.data }
          : { status: uploads.status },
      failures:
        failures.status === "ready"
          ? { status: "ready", data: failures.data }
          : { status: failures.status },
      massUnit,
      lengthUnit,
      signedOut,
    };
  }, [
    healthScore,
    healthSignals,
    insights,
    intelligence,
    dailyFacts,
    labs,
    uploads,
    failures,
    profile,
    massUnit,
    lengthUnit,
    signedOut,
  ]);

  // Loading: core truths still resolving (avoid showing fake zeroes mid-flight).
  const loading =
    !signedOut &&
    (healthScore.status === "partial" || dailyFacts.status === "partial");

  const vm = useMemo(() => buildDigitalTwinHomeVm({ ctx, loading }), [ctx, loading]);

  const refetch = () => {
    healthScore.refetch();
    healthSignals.refetch();
    insights.refetch();
    intelligence.refetch();
    dailyFacts.refetch();
    labs.refetch();
    uploads.refetch();
    failures.refetch();
  };

  return { vm, ctx, loading, signedOut, refetch };
}
