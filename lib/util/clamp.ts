export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new Error("clamp: min cannot be greater than max");
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
