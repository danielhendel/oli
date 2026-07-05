import { useMemo } from "react";

import type { TruthGetOptions } from "@/lib/api/usersMe";
import {
  buildDailyReadinessCardModel,
  dailyReadinessCardAccessibilityLabel,
  type DailyReadinessCardModel,
} from "@/lib/data/dash/buildDailyReadinessCardModel";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useReadinessView } from "@/lib/data/useReadinessView";
import type { Readiness } from "@/lib/contracts/readiness";
import type { DayKey } from "@/lib/ui/calendar/types";

export type DailyReadinessCardViewModel =
  | { status: Extract<Readiness, "partial">; day: string }
  | {
      status: Extract<Readiness, "missing">;
      day: string;
      message: string;
      cta?: { label: string; href: string };
    }
  | { status: Extract<Readiness, "error">; day: string; message: string }
  | {
      status: Extract<Readiness, "ready">;
      day: string;
      model: DailyReadinessCardModel;
      accessibilityLabel: string;
    };

const READINESS_DETAIL_HREF = "/(app)/recovery/readiness" as const;
const OURA_RECONNECT_HREF = "/(app)/settings/devices/oura" as const;

export type UseDailyReadinessCardResult = {
  vm: DailyReadinessCardViewModel;
  refetch: (opts?: TruthGetOptions) => void;
};

export function useDailyReadinessCard(day: DayKey, options?: { enabled?: boolean }): UseDailyReadinessCardResult {
  const enabled = options?.enabled ?? true;
  const readiness = useReadinessView(day);
  const ouraPresence = useOuraPresence();

  const ouraConnected =
    ouraPresence.status === "ready" ? ouraPresence.data.connected : null;

  const vm = useMemo((): DailyReadinessCardViewModel => {
    if (!enabled) {
      return { status: "partial", day };
    }
    if (readiness.status === "partial") {
      return { status: "partial", day };
    }
    if (readiness.status === "error") {
      return { status: "error", day, message: readiness.error };
    }

    const model = buildDailyReadinessCardModel({
      day,
      readinessView: readiness.status === "ready" ? readiness.data : null,
      ouraConnected,
    });

    if (ouraConnected === false) {
      return {
        status: "missing",
        day,
        message: model.summarySentence,
        cta: { label: "Reconnect Oura \u2192", href: OURA_RECONNECT_HREF },
      };
    }

    if (!model.hasAnySignal) {
      return { status: "missing", day, message: model.summarySentence };
    }

    return {
      status: "ready",
      day,
      model,
      accessibilityLabel: dailyReadinessCardAccessibilityLabel(model),
    };
  }, [day, enabled, ouraConnected, readiness]);

  return useMemo(
    () => ({ vm, refetch: readiness.refetch }),
    [vm, readiness.refetch],
  );
}

export { READINESS_DETAIL_HREF };
