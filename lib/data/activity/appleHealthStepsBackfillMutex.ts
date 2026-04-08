/**
 * Serializes every Apple Health steps backfill/repair run (auto + manual) so AsyncStorage progress
 * and HealthKit queries cannot interleave.
 */
let chain: Promise<void> = Promise.resolve();

export function runAppleHealthStepsBackfillSerialized<T>(fn: () => Promise<T>): Promise<T> {
  let result: T;
  const next = chain.then(async () => {
    result = await fn();
  });
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next.then(() => result!);
}
