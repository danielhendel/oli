// apps/mobile/__tests__/auth-actions.test.ts
import { signInEmailPassword, signUpEmailPassword, signOutUser } from '@/lib/auth/actions';
import { ensureAuthInitialized, getFirebaseAuth } from '@/lib/firebase/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';

jest.mock('@/lib/firebase/core', () => ({
  ensureAuthInitialized: jest.fn(async () => ({})),
  getFirebaseAuth: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(async () => ({})),
  signInWithEmailAndPassword: jest.fn(async () => ({})),
  signOut: jest.fn(async () => {}),
}));

describe('auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs up with email/password', async () => {
    await signUpEmailPassword('a@b.com', 'secret1');
    expect(ensureAuthInitialized).toHaveBeenCalled();
    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
  });

  it('signs in with email/password', async () => {
    await signInEmailPassword('a@b.com', 'secret1');
    expect(ensureAuthInitialized).toHaveBeenCalled();
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
  });

  it('signs out', async () => {
    await signOutUser();
    expect(getFirebaseAuth).toHaveBeenCalled();
    expect(fbSignOut).toHaveBeenCalled();
  });
});
