// File: apps/mobile/__tests__/firestore.dal.spec.ts
import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { getFirestore } from 'firebase/firestore';
import { createEvent, addWorkoutLog, getDailyFact } from '@/lib/db';

let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');
  env = await initializeTestEnvironment({
    projectId: 'healthos-rules-test',
    firestore: { rules },
  });
});

afterAll(async () => {
  if (env) await env.cleanup();
});

test('DAL respects rules: event append-only, logs allowed, facts read-only', async () => {
  const UID = 'userA';
  const ctx = env.authenticatedContext(UID);
  const fdb = ctx.firestore();

  // Append-only event (allowed)
  await assertSucceeds(
    createEvent(fdb as unknown as ReturnType<typeof getFirestore>, UID, {
      kind: 'workout.logged',
      payload: { hello: 'world' },
    } as any)
  );

  // Write a workout log (allowed)
  await assertSucceeds(
    addWorkoutLog(fdb as any, UID, { date: '2025-10-14', sections: [], source: 'app' } as any)
  );

  // Facts are client read-only: read should succeed…
  await assertSucceeds(getDailyFact(fdb as any, UID, '2025-10-14'));

  // …but client writes must fail
  await assertFails(
    fdb.doc(`users/${UID}/facts/daily/2025-10-14`).set({ totalSets: 10 })
  );
});
