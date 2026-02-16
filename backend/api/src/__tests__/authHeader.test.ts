import { describe, it, expect } from '@jest/globals';

describe('auth header contract', () => {
  it('accepts Bearer tokens', () => {
    const parse = (h?: string) => h?.startsWith('Bearer ');
    expect(parse(undefined)).toBe(false);
    expect(parse('Basic xxx')).toBe(false);
    expect(parse('Bearer token')).toBe(true);
  });
});
