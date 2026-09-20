import {
  resolveBodyMetricEntrySheetLayout,
} from "@/lib/ui/body/bodyMetricEntrySheetLayout";

describe("resolveBodyMetricEntrySheetLayout", () => {
  it("resting: uses safe-area once and leaves maxHeight content-driven", () => {
    const layout = resolveBodyMetricEntrySheetLayout({
      keyboardHeight: 0,
      safeAreaBottom: 34,
      windowHeight: 844,
    });
    expect(layout.keyboardVisible).toBe(false);
    expect(layout.bottomPadding).toBe(34);
    expect(layout.maxHeight).toBeUndefined();
  });

  it("resting: falls back to restingBottomMin when safe area is 0", () => {
    const layout = resolveBodyMetricEntrySheetLayout({
      keyboardHeight: 0,
      safeAreaBottom: 0,
      windowHeight: 844,
    });
    expect(layout.bottomPadding).toBe(16);
    expect(layout.maxHeight).toBeUndefined();
  });

  it("editing: applies keyboard height once without stacking safe area", () => {
    const layout = resolveBodyMetricEntrySheetLayout({
      keyboardHeight: 336,
      safeAreaBottom: 34,
      windowHeight: 844,
    });
    expect(layout.keyboardVisible).toBe(true);
    // Must NOT be 336 + 34
    expect(layout.bottomPadding).toBe(336);
    expect(layout.maxHeight).toBe(844 - 336 - 16);
  });

  it("keyboard hide restores compact resting padding", () => {
    const editing = resolveBodyMetricEntrySheetLayout({
      keyboardHeight: 300,
      safeAreaBottom: 34,
      windowHeight: 844,
    });
    const resting = resolveBodyMetricEntrySheetLayout({
      keyboardHeight: 0,
      safeAreaBottom: 34,
      windowHeight: 844,
    });
    expect(editing.bottomPadding).toBe(300);
    expect(resting.bottomPadding).toBe(34);
    expect(resting.maxHeight).toBeUndefined();
  });

  it("ignores non-positive keyboard heights as resting", () => {
    const layout = resolveBodyMetricEntrySheetLayout({
      keyboardHeight: -10,
      safeAreaBottom: 20,
      windowHeight: 800,
    });
    expect(layout.keyboardVisible).toBe(false);
    expect(layout.bottomPadding).toBe(20);
  });
});
