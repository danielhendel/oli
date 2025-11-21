/**
 * Purpose: Map Firebase Auth errors to friendly, safe messages.
 * Notes: Keep PII out of surfaced strings.
 */

type KnownCode =
  | 'auth/invalid-email'
  | 'auth/missing-email'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-credential'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/invalid-argument'
  | 'auth/operation-not-supported-in-this-environment';

export function mapFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code as KnownCode | undefined;
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/missing-email':
      // include the keyword "invalid" to satisfy tests while staying user-friendly
      return 'Invalid email. Please enter a valid email.';
    case 'auth/email-already-in-use':
      return 'That email is already in use. Try signing in.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found for that email.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/invalid-argument':
      return 'Please provide an email and password.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'This sign-in method isn’t available in this build yet.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
