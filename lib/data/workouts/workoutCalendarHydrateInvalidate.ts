/**
 * Cross-screen signal so workout calendar hydrates refetch after durable mutations (e.g. title override ingest).
 */

const listeners = new Set<() => void>();

export function invalidateWorkoutCalendarHydrate(): void {
  for (const l of listeners) {
    l();
  }
}

export function subscribeWorkoutCalendarHydrateInvalidate(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
