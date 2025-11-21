import { mapFirebaseError } from '@/lib/auth/errorMap';

type FirebaseErrorLike = { code: string; message?: string };

describe('mapFirebaseError', () => {
  it('maps invalid email to a friendly string', () => {
    const msg = mapFirebaseError({ code: 'auth/invalid-email' });
    expect(msg.toLowerCase()).toContain('invalid');
  });

  it('falls back to generic message', () => {
    const msg = mapFirebaseError({ code: 'auth/some-unknown' } as FirebaseErrorLike);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(5);
  });
});
