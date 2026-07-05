/** VoiceOver label for a Today’s Progress card row (result + progress percent). */
export function todayProgressCardAccessibilityLabel(
  label: string,
  value: string,
  progressPercent: number,
): string {
  const resultPhrase = value === "\u2014" ? "no result yet" : value;
  const percent = Math.max(0, Math.min(100, Math.round(progressPercent)));
  return `${label}, ${resultPhrase}, ${percent} percent complete. Open ${label}.`;
}
