/**
 * Integration-style unit test for signInWithApple()
 * - Mocks native modules (expo-apple-authentication, expo-crypto)
 * - Mocks Firebase Auth (OAuthProvider + signInWithCredential)
 * - Uses centralized client boundary (getFirebaseAuth) for assertions
 * - Verifies we exchange Apple idToken with Firebase using the *raw* nonce
 */

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0 },
  isAvailableAsync: jest.fn(async () => true), // ✅ ensure available
  signInAsync: jest.fn(async () => ({
    identityToken: 'apple-id-token.jwt',
  })),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'hashed-nonce-hex'),
}));

// Silence telemetry
jest.mock('@/lib/analytics/telemetry', () => ({
  logEvent: jest.fn(),
}));

// Mock Firebase Auth (only the parts we assert against)
jest.mock('firebase/auth', () => {
  const signInWithCredential = jest.fn(async () => undefined);
  const OAuthProvider = jest.fn().mockImplementation((_providerId: string) => ({}));
  (OAuthProvider as any).credential = jest.fn((opts: { idToken: string; rawNonce: string }) => ({
    _type: 'apple-credential',
    ...opts,
  }));

  return {
    signInWithCredential,
    OAuthProvider,
  };
});

// Import AFTER mocks so the mocked modules are used
import { signInWithApple } from '@/lib/auth/oauth/apple';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

describe('signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exchanges Apple identityToken with Firebase using raw nonce', async () => {
    await expect(signInWithApple()).resolves.toBeUndefined();

    // getFirebaseAuth called once (centralized boundary)
    expect(getFirebaseAuth).toHaveBeenCalledTimes(1);

    // OAuthProvider constructed with 'apple.com'
    expect(OAuthProvider).toHaveBeenCalledWith('apple.com');

    // Validate credential passed to signInWithCredential
    const calledArg = (signInWithCredential as jest.Mock).mock.calls[0][1];
    expect(calledArg).toMatchObject({
      _type: 'apple-credential',
      idToken: 'apple-id-token.jwt',
    });

    // rawNonce exists and looks like base64url
    expect(typeof calledArg.rawNonce).toBe('string');
    expect(calledArg.rawNonce.length).toBeGreaterThan(30);
    expect(/^[A-Za-z0-9\-_]+$/.test(calledArg.rawNonce)).toBe(true);
  });
});
