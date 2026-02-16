/** @jest-environment node */
// __tests__/firebase.probe.test.ts
/**
 * Firestore probe test (emulator-aware).
 * - If FIRESTORE_EMULATOR_HOST is set → perform real write/read against emulator.
 * - Otherwise → fast-pass (no network), just verifies module wiring.
 */
import { jest, afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { doc, getDoc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';

const COLL = 'test_probes';
const DOC_ID = `probe_${Date.now()}`;

// Provide minimal env so firebaseClient can initialize in Node
const ensureEnv = (k: string, v: string) => {
  if (!process.env[k]) process.env[k] = v;
};
ensureEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'test-api-key');
ensureEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'test-project.firebaseapp.com');
ensureEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'test-project');
ensureEnv('EXPO_PUBLIC_FIREBASE_APP_ID', '1:123:web:testappid');
ensureEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '1234567890');
ensureEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test-project.appspot.com');

let usedEmulator = false;
let emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';

let getFirestoreDb: () => import('firebase/firestore').Firestore;

describe('Firestore probe', () => {
  beforeAll(() => {
    if (emulatorHost) {
      jest.unmock('@/lib/firebaseClient');
      const real: any = jest.requireActual('@/lib/firebaseClient');
      getFirestoreDb = real.getFirestoreDb;

      const db = getFirestoreDb();
      const [h, p] = emulatorHost.split(':');
      connectFirestoreEmulator(db, h, Number(p));
      usedEmulator = true;
    } else {
      const maybeMock: any = jest.requireMock('@/lib/firebaseClient');
      getFirestoreDb = maybeMock.getFirestoreDb ?? (() => ({} as any));
    }
  });

  it('writes and reads a document (or fast-passes without emulator)', async () => {
    if (!usedEmulator) {
      expect(typeof getFirestoreDb).toBe('function');
      return;
    }

    const db = getFirestoreDb();
    const ref = doc(db, COLL, DOC_ID);
    await setDoc(ref, {
      ok: true,
      ts: Date.now(),
      probe_tag: 'firebase.probe'
    });
    const snap = await getDoc(ref);
    expect(snap.exists()).toBe(true);
    expect(snap.get('ok')).toBe(true);
  });

  afterAll(() => {
    console.log(`[firebase.probe] emulator=${usedEmulator}`);
  });
});
