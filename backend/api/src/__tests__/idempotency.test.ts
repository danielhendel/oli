import { describe, it, expect } from '@jest/globals';

describe('idempotency header contract', () => {
  it('requires Idempotency-Key header', () => {
    const hasHeader = (headers: Record<string, string>) => Boolean(headers['Idempotency-Key']);
    expect(hasHeader({} as any)).toBe(false);
    expect(hasHeader({ 'Idempotency-Key': 'abc' } as any)).toBe(true);
  });
});
