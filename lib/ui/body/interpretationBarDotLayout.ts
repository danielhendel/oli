/** Pixel position for interpretation bar dot so it stays fully inside the track (pure, testable). */
export function clampedDotLeftPx(trackWidthPx: number, marker01: number, dotSizePx: number): number {
  if (!(trackWidthPx > 0) || !(dotSizePx > 0)) return 0;
  const half = dotSizePx / 2;
  const center = marker01 * trackWidthPx;
  const clampedCenter = Math.min(trackWidthPx - half, Math.max(half, center));
  return clampedCenter - half;
}
