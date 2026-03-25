import { WorkoutLogScreenInner } from "./log";

/**
 * Add exercises for a specific workout from day detail — journal session is scoped by
 * enrichTargetId via enrichSessionStorage, not the global live active pointer.
 */
export default function WorkoutEnrichRoute() {
  return <WorkoutLogScreenInner sessionEntry="enrichment" />;
}
