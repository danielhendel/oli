const { clamp } = require('../clamp');

describe('clamp()', () => {
  test('returns min when below range', () => {
    expect(clamp(-10, 0, 5)).toBe(0);
  });
  test('returns max when above range', () => {
    expect(clamp(10, 0, 5)).toBe(5);
  });
  test('returns value when within range', () => {
    expect(clamp(3, 0, 5)).toBe(3);
  });
  test('throws when min > max', () => {
    expect(() => clamp(1, 5, 0)).toThrow(/min cannot be greater than max/);
  });
});