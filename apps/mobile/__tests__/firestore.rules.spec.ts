// File: apps/mobile/__tests__/firestore.rules.spec.ts
/**
 * Firestore Rules tests using @firebase/rules-unit-testing
 * Runs under `firebase emulators:exec` so no manual emulator is needed.
 */
import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';

let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // IMPORTANT: We do NOT pass host/port here.
  // When you run via `firebase emulators:exec`, it sets FIRESTORE_EMULATOR_HOST
  // and the test SDK auto-discovers the emulator.
  env = await initializeTestEnvironment({
    projectId: 'healthos-rules-test',
    firestore: { rules },
  });
});

afterAll(async () => {
  if (env) await env.cleanup();
});

describe('Firestore Security Rules', () => {
  const UID_A = 'userA';
  const UID_B = 'userB';

  test('user can read/write own profile', async () => {
    const ctx = env.authenticatedContext(UID_A);
    const ref = ctx.firestore().doc(`users/${UID_A}/profile/general`);
    await assertSucceeds(ref.set({ uid: UID_A, name: 'Test' }));
    await assertSucceeds(ref.get());
  });

  test('user cannot read another user profile', async () => {
    const ctx = env.authenticatedContext(UID_B);
    const ref = ctx.firestore().doc(`users/${UID_A}/profile/general`);
    await assertFails(ref.get());
  });

  test('user cannot update derived fact doc', async () => {
    const ctx = env.authenticatedContext(UID_A);
    const ref = ctx.firestore().doc(`users/${UID_A}/facts/daily/2025-10-14`);
    await assertFails(ref.set({ uid: UID_A, totalSets: 10 }));
  });

  test('user can create event but not modify it', async () => {
    const ctx = env.authenticatedContext(UID_A);
    const evRef = ctx.firestore().doc(`events/testEvent`);
    await assertSucceeds(evRef.set({ uid: UID_A, kind: 'workout.logged' }));
    await assertFails(evRef.update({ kind: 'tampered' }));
  });
});
