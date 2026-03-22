/** Raw event kinds hydrated for calendar / recent / analytics (Apple Health + app strength). */
export type WorkoutCalendarRawEventKind = "workout" | "strength_workout";

/** Canonical kinds for calendar / recent / analytics (Apple Health + app strength sessions). */
export const DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS: readonly WorkoutCalendarRawEventKind[] = [
  "workout",
  "strength_workout",
];

export type WorkoutCalendarRawEventKindsOptions = {
  rawEventKinds?: readonly WorkoutCalendarRawEventKind[];
};

export function resolveWorkoutCalendarRawEventKinds(
  options?: WorkoutCalendarRawEventKindsOptions,
): WorkoutCalendarRawEventKind[] {
  if (options?.rawEventKinds?.length) return [...options.rawEventKinds];
  return [...DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS];
}
