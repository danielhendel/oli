/**
 * Integration-style unit test for signInWithApple()
 * - Mocks native modules (expo-apple-authentication, expo-crypto)
 * - Mocks Firebase Auth (getAuth + signInWithCredential) *inside* the factory
 * - Mocks telemetry to avoid console noise
 * - Verifies we exchange Apple idToken with Firebase using the *raw* nonce
 */

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0 },
  signInAsync: jest.fn(async () => ({
    identityToken: 'apple-id-token.jwt',
  })),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'hashed-nonce-hex'),
}));

// Silence telemetry
jest.mock('../lib/analytics/telemetry', () => ({
  logEvent: jest.fn(),
}));

// Mock Firebase Auth (all created inside the factory; no out-of-scope refs)
jest.mock('firebase/auth', () => {
  const getAuth = jest.fn(() => ({}));
  const signInWithCredential = jest.fn(async () => undefined);
  const OAuthProvider = jest.fn().mockImplementation((_providerId: string) => ({
    credential: jest.fn((opts: { idToken: string; rawNonce: string }) => ({
      _type: 'apple-credential',
      ...opts,
    })),
  }));
  return {
    getAuth,
    signInWithCredential,
    OAuthProvider,
  };
});

// Import AFTER mocks so the mocked modules are used
import { signInWithApple } from '../lib/auth/oauth/apple';
import { getAuth, signInWithCredential, OAuthProvider } from 'firebase/auth';

describe('signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exchanges Apple identityToken with Firebase using raw nonce', async () => {
    await expect(signInWithApple()).resolves.toBeUndefined();

    // getAuth called once
    expect(getAuth).toHaveBeenCalledTimes(1);

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
