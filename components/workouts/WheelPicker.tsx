/**
 * Deterministic wheel picker using FlatList: fixed item height, snap, initialScrollIndex.
 * Used by workout logger for reps/load/RPE. No setTimeout, requestAnimationFrame, or delayed scrollTo.
 * Centered selection band; display label (no units) vs accessibility label (descriptive) supported.
 */

import React, { useCallback, useMemo, useRef } from "react";
import { View, FlatList, StyleSheet, Pressable, Text } from "react-native";

const ITEM_HEIGHT = 44;
const VISIBLE_HEIGHT = 220;
const PADDING = (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2;

/** Optional quick-jump control: label (e.g. "+10"), resolve(current) => new value or null to disable, optional a11y label. */
export type QuickJumpConfig<T> = {
  label: string;
  /** Screen reader label (e.g. "Add 10 lb"). Falls back to label when omitted. */
  accessibilityLabel?: string;
  resolve: (current: T) => T | null;
};

export type WheelPickerProps<T> = {
  data: T[];
  value: T;
  onValueChange: (value: T) => void;
  /** Descriptive label for accessibility and tests (e.g. "5 reps", "97.5 lb"). */
  getOptionLabel: (value: T) => string;
  /** Optional short label for visible wheel text only (e.g. "5", "97.5", "BW"). When omitted, getOptionLabel is used. */
  getDisplayLabel?: (value: T) => string;
  /** Optional quick-jump control(s) on the left (e.g. +5, +10 lb). Single config or array of up to 2. When resolve(value) returns null, button is disabled. */
  quickJumpLeft?: QuickJumpConfig<T> | QuickJumpConfig<T>[];
  /** Optional quick-jump control(s) on the right (e.g. +25, +45 lb). Single config or array of up to 2. When resolve(value) returns null, button is disabled. */
  quickJumpRight?: QuickJumpConfig<T> | QuickJumpConfig<T>[];
  testID?: string;
};

/** Memoized row so only rows with changed isSelected re-render when value updates. */
const WheelPickerRow = React.memo(function WheelPickerRow<T>({
  item,
  isSelected,
  optionLabel,
  displayLabel,
  onSelectRef,
}: {
  item: T;
  isSelected: boolean;
  optionLabel: string;
  displayLabel: string;
  onSelectRef: React.MutableRefObject<(v: T) => void>;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={() => onSelectRef.current(item)}
      accessibilityRole="button"
      accessibilityLabel={optionLabel}
    >
      <Text style={isSelected ? styles.itemTextActive : styles.itemTextSubdued}>
        {displayLabel}
      </Text>
    </Pressable>
  );
}) as <T>(props: {
  item: T;
  isSelected: boolean;
  optionLabel: string;
  displayLabel: string;
  onSelectRef: React.MutableRefObject<(v: T) => void>;
}) => React.ReactElement;

function WheelPickerInner<T>({
  data,
  value,
  onValueChange,
  getOptionLabel,
  getDisplayLabel,
  quickJumpLeft,
  quickJumpRight,
  testID,
}: WheelPickerProps<T>) {
  const options = data;
  const index = options.indexOf(value);
  const initialIndex = index >= 0 ? index : 0;

  const listRef = useRef<FlatList<(T | "spacer")>>(null);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const getOptionLabelRef = useRef(getOptionLabel);
  const getDisplayLabelRef = useRef(getDisplayLabel);
  /** When true, the next onScrollEnd was caused by a programmatic quick-jump scroll; do not call onValueChange again. */
  const ignoreNextScrollEndRef = useRef(false);
  /** When set, onScrollEnd (in ignore path) will force this exact offset for perfect band alignment. */
  const quickJumpTargetOffsetRef = useRef<number | null>(null);
  valueRef.current = value;
  onValueChangeRef.current = onValueChange;
  getOptionLabelRef.current = getOptionLabel;
  getDisplayLabelRef.current = getDisplayLabel;

  const getItemLayout = useCallback(
    (_: unknown, i: number) => {
      const n = options.length;
      const length = i === 0 || i === n + 1 ? PADDING : ITEM_HEIGHT;
      const offset =
        i === 0 ? 0 : i === n + 1 ? PADDING + n * ITEM_HEIGHT : PADDING + (i - 1) * ITEM_HEIGHT;
      return { length, offset, index: i };
    },
    [options.length],
  );

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (ignoreNextScrollEndRef.current) {
        const targetOffset = quickJumpTargetOffsetRef.current;
        if (targetOffset != null) {
          listRef.current?.scrollToOffset({ offset: targetOffset, animated: false });
          quickJumpTargetOffsetRef.current = null;
        }
        ignoreNextScrollEndRef.current = false;
        return;
      }
      const y = e.nativeEvent.contentOffset.y;
      const optionIndex = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(options.length - 1, optionIndex));
      const newVal = options[clamped];
      if (newVal !== undefined && newVal !== valueRef.current) onValueChangeRef.current(newVal);
    },
    [options],
  );

  const renderItem = useCallback(
    ({ item }: { item: T | "spacer"; index: number }) => {
      if (item === "spacer") {
        return <View style={styles.spacer} />;
      }
      const optionLabel = getOptionLabelRef.current(item);
      const displayLabel = getDisplayLabelRef.current
        ? getDisplayLabelRef.current(item)
        : getOptionLabelRef.current(item);
      const isSelected = item === valueRef.current;
      return (
        <WheelPickerRow
          item={item}
          isSelected={isSelected}
          optionLabel={optionLabel}
          displayLabel={displayLabel}
          onSelectRef={onValueChangeRef as React.MutableRefObject<(v: T) => void>}
        />
      );
    },
    [],
  );

  const listData = useMemo(() => {
    const arr: (T | "spacer")[] = ["spacer", ...options, "spacer"];
    return arr;
  }, [options]);

  const keyExtractor = useCallback((item: T | "spacer", i: number) => {
    const idx = typeof i === "number" ? i : 0;
    if (item === "spacer") return `spacer-${idx}`;
    return `opt-${idx}`;
  }, []);

  const handleQuickJump = useCallback(
    (config: QuickJumpConfig<T>) => {
      const newVal = config.resolve(valueRef.current);
      if (newVal === null || newVal === valueRef.current) return;
      const targetIndex = options.indexOf(newVal);
      if (targetIndex < 0) return;
      onValueChangeRef.current(newVal);
      ignoreNextScrollEndRef.current = true;
      const canonicalOffset = targetIndex * ITEM_HEIGHT;
      quickJumpTargetOffsetRef.current = canonicalOffset;
      listRef.current?.scrollToOffset({
        offset: canonicalOffset,
        animated: true,
      });
    },
    [options],
  );

  const leftConfigs = useMemo(
    () => (quickJumpLeft == null ? [] : Array.isArray(quickJumpLeft) ? quickJumpLeft : [quickJumpLeft]),
    [quickJumpLeft],
  );
  const rightConfigs = useMemo(
    () => (quickJumpRight == null ? [] : Array.isArray(quickJumpRight) ? quickJumpRight : [quickJumpRight]),
    [quickJumpRight],
  );
  const showQuickJump = leftConfigs.length > 0 || rightConfigs.length > 0;

  return (
    <View style={[styles.container, { height: VISIBLE_HEIGHT }]} testID={testID}>
      <View style={styles.selectionBand} pointerEvents="none" />
      {showQuickJump && (
        <View style={styles.quickJumpRow} pointerEvents="box-none">
          <View style={styles.quickJumpSide}>
            {leftConfigs.map((config, i) => {
              const target = config.resolve(value);
              return (
                <Pressable
                  key={config.label}
                  style={[styles.quickJumpPill, target === null && styles.quickJumpBtnDisabled]}
                  onPress={() => handleQuickJump(config)}
                  disabled={target === null}
                  accessibilityRole="button"
                  accessibilityLabel={config.accessibilityLabel ?? config.label ?? ""}
                  testID={testID ? `${testID}-quick-jump-left${leftConfigs.length > 1 ? `-${i}` : ""}` : undefined}
                >
                  <Text style={styles.quickJumpLabel}>{config.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.quickJumpSpacer} />
          <View style={styles.quickJumpSide}>
            {rightConfigs.map((config, i) => {
              const target = config.resolve(value);
              return (
                <Pressable
                  key={config.label}
                  style={[styles.quickJumpPill, target === null && styles.quickJumpBtnDisabled]}
                  onPress={() => handleQuickJump(config)}
                  disabled={target === null}
                  accessibilityRole="button"
                  accessibilityLabel={config.accessibilityLabel ?? config.label ?? ""}
                  testID={testID ? `${testID}-quick-jump-right${rightConfigs.length > 1 ? `-${i}` : ""}` : undefined}
                >
                  <Text style={styles.quickJumpLabel}>{config.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        extraData={value}
        initialNumToRender={Math.min(
          listData.length,
          Math.max(25, 2 + initialIndex + 12),
        )}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export const WheelPicker = React.memo(WheelPickerInner) as typeof WheelPickerInner;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  selectionBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.18)",
    zIndex: 1,
  },
  list: {
    flex: 1,
  },
  spacer: {
    height: PADDING,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTextActive: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  itemTextSubdued: {
    fontSize: 18,
    fontWeight: "500",
    color: "#8E8E93",
  },
  quickJumpRow: {
    position: "absolute",
    left: 12,
    right: 12,
    top: PADDING,
    height: ITEM_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  quickJumpSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickJumpPill: {
    minWidth: 44,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 122, 255, 0.14)",
    borderRadius: 20,
  },
  quickJumpBtnDisabled: {
    opacity: 0.4,
  },
  quickJumpSpacer: {
    flex: 1,
    minWidth: 8,
  },
  quickJumpLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(0, 122, 255, 0.95)",
  },
});
