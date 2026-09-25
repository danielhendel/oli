/**
 * Pure layout helpers for Body metric manual-entry sheets.
 * One keyboard source + one safe-area source — never both stacked.
 */

export type BodyMetricEntrySheetLayoutInput = {
  readonly keyboardHeight: number;
  readonly safeAreaBottom: number;
  readonly windowHeight: number;
  /** Minimum resting bottom padding when keyboard is hidden. */
  readonly restingBottomMin?: number;
  /** Small gap between sheet top and status-bar / notch when editing. */
  readonly editingTopGap?: number;
};

export type BodyMetricEntrySheetLayout = {
  /** Applied once as sheet paddingBottom (keyboard OR safe-area, never both). */
  readonly bottomPadding: number;
  /** Content-driven resting; capped only while keyboard is visible. */
  readonly maxHeight: number | undefined;
  readonly keyboardVisible: boolean;
};

const DEFAULT_RESTING_BOTTOM_MIN = 16;
const DEFAULT_EDITING_TOP_GAP = 16;

/**
 * Resolve resting vs editing sheet insets.
 *
 * Root cause this replaces: KeyboardAvoidingView padding + safe-area paddingBottom
 * stacked inside a bottom-aligned Modal, which clipped the title while editing and
 * left a stale empty gap after keyboard hide.
 */
export function resolveBodyMetricEntrySheetLayout(
  input: BodyMetricEntrySheetLayoutInput,
): BodyMetricEntrySheetLayout {
  const restingBottomMin = input.restingBottomMin ?? DEFAULT_RESTING_BOTTOM_MIN;
  const editingTopGap = input.editingTopGap ?? DEFAULT_EDITING_TOP_GAP;
  const keyboardHeight =
    Number.isFinite(input.keyboardHeight) && input.keyboardHeight > 0
      ? input.keyboardHeight
      : 0;
  const safeAreaBottom =
    Number.isFinite(input.safeAreaBottom) && input.safeAreaBottom > 0
      ? input.safeAreaBottom
      : 0;
  const keyboardVisible = keyboardHeight > 0;

  // Keyboard frame already reaches the physical bottom — do not add safe-area again.
  const bottomPadding = keyboardVisible
    ? keyboardHeight
    : Math.max(safeAreaBottom, restingBottomMin);

  const maxHeight = keyboardVisible
    ? Math.max(200, input.windowHeight - keyboardHeight - editingTopGap)
    : undefined;

  return { bottomPadding, maxHeight, keyboardVisible };
}
