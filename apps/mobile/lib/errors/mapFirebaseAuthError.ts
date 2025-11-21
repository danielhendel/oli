// apps/mobile/lib/errors/mapFirebaseAuthError.ts
import type { FirebaseError } from 'firebase/app';

const isDev = process.env.NODE_ENV !== 'production';

/** Map Firebase/AuthSession/Apple/Google errors to friendly UI strings. */
export function mapFirebaseAuthError(e: unknown): string {
  const fe = e as Partial<FirebaseError> & { code?: string; message?: string };
  const code = fe?.code ?? 'unknown';

  const table: Record<string, string> = {
    // Firebase email/password
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'There was a security validation issue. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled.',

    // Apple
    'auth/missing-or-invalid-nonce': 'Security validation failed. Please try again.',
    'apple/missing-identity-token': 'We couldn’t verify your Apple ID. Please try again.',
    'apple/canceled': 'Sign in canceled.',

    // Google
    'google/missing-id-token': 'Google did not return an ID token. Please try again.',

    // Web/Popup fallbacks
    'auth/cancelled-popup-request': 'Sign in was canceled. Please try again.',
    'auth/popup-closed-by-user': 'Sign in was closed before completing.',
    ERR_REQUEST_CANCELED: 'Sign in canceled.',
  };

  if (table[code]) return table[code];

  const generic = 'Something went wrong signing you in. Please try again.';
  return isDev && code !== 'unknown' ? `${generic} (${code})` : generic;
}
