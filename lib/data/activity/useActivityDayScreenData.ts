import { normalizeActivityDayRouteParam } from "@/lib/data/activity/activityDayRouteParam";
import { useActivityDaySteps } from "@/lib/data/activity/useActivityDaySteps";

/**
 * Activity day route: normalize `day` from the screen (pathname-derived when provided by the screen,
 * else `string | string[] | undefined`) and load steps via GET /users/me/daily-facts — same trust boundary as
 * {@link useActivityStepsRollupMap}.
 */
export function useActivityDayScreenData(rawDayParam: unknown): {
  normalized: ReturnType<typeof normalizeActivityDayRouteParam>;
  state: ReturnType<typeof useActivityDaySteps>["state"];
  reload: ReturnType<typeof useActivityDaySteps>["reload"];
} {
  const normalized = normalizeActivityDayRouteParam(rawDayParam);
  const dayKey = normalized.ok ? normalized.day : null;
  const { state, reload } = useActivityDaySteps(dayKey);
  return { normalized, state, reload };
}
