/** VoiceOver label for a Today’s Progress card row (result-only). */
export function todayProgressCardAccessibilityLabel(label: string, value: string): string {
  return `${label}, ${value}. Open ${label}.`;
}
