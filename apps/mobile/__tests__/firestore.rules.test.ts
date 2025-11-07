/** @jest-environment node */
import fs from 'fs';
import path from 'path';

if (!process.env.RUN_RULES_TESTS) {
  // Skip this suite unless explicitly enabled (prevents ECONNREFUSED on normal `npm test`)
  describe('Firestore security rules (skipped by default)', () => {
    it('enable via RUN_RULES_TESTS=1', () => {
      // intentionally empty
    });
  });
} else {
  // Only load heavy deps when running
  const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

  describe('Firestore security rules', () => {
    let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>> | undefined;

    beforeAll(async () => {
      testEnv = await initializeTestEnvironment({
        projectId: 'demo-oli',
        firestore: {
          host: '127.0.0.1',
          port: 8080,
          rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
        },
      });
    });

    afterAll(async () => {
      if (testEnv) await testEnv.cleanup();
    });

    it('allows a user to read/write their own document', async () => {
      const user = testEnv!.authenticatedContext('user123');
      const db = user.firestore();
      const ref = db.collection('users').doc('user123');
      await ref.set({ name: 'Daniel' });
      const snap = await ref.get();
      expect(snap.data()).toEqual({ name: 'Daniel' });
    });

    it('denies writing another user’s document', async () => {
      const user = testEnv!.authenticatedContext('user123');
      const db = user.firestore();
      const ref = db.collection('users').doc('otherUser');
      await expect(ref.set({ name: 'Hack' })).rejects.toThrow();
    });
  });
}
