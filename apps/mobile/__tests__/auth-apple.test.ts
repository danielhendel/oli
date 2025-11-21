import { generateRawNonce } from '../lib/auth/oauth/apple.utils';

describe('auth/apple nonce', () => {
  it('generates a url-safe nonce of reasonable length', async () => {
    const n = await generateRawNonce();
    expect(typeof n).toBe('string');
    expect(n.length).toBeGreaterThan(30); // ~43 chars from 32 bytes
    expect(/^[A-Za-z0-9\-_]+$/.test(n)).toBe(true);
  });
});
