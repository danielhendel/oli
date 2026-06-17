/**
 * Single-column snap wheel for nutrition time pickers (dark theme).
 * Visible labels and accessibility labels are separate (iOS-style picker).
 */
import React, { useCallback, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export const NUTRITION_WHEEL_ITEM_HEIGHT = 44;
export const NUTRITION_WHEEL_VISIBLE_HEIGHT = 196;
export const NUTRITION_WHEEL_PADDING =
  (NUTRITION_WHEEL_VISIBLE_HEIGHT - NUTRITION_WHEEL_ITEM_HEIGHT) / 2;

type Props<T> = {
  data: readonly T[];
  value: T;
  onValueChange: (value: T) => void;
  /** Short label shown in the wheel row. */
  getDisplayLabel: (value: T) => string;
  /** Descriptive VoiceOver label (e.g. "Hour 1", "Minute 22"). */
  getAccessibilityLabel: (value: T) => string;
  /** When false, parent draws a shared selection band across columns. */
  showSelectionBand?: boolean;
  testID?: string;
};

function WheelRow<T>({
  item,
  isSelected,
  displayLabel,
  accessibilityLabel,
  onSelectRef,
  testID,
}: {
  item: T;
  isSelected: boolean;
  displayLabel: string;
  accessibilityLabel: string;
  onSelectRef: React.MutableRefObject<(v: T) => void>;
  testID?: string;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={() => onSelectRef.current(item)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[styles.itemText, isSelected ? styles.itemTextActive : styles.itemTextSubdued]}
        testID={testID}
      >
        {displayLabel}
      </Text>
    </Pressable>
  );
}

export function NutritionWheelColumn<T>({
  data,
  value,
  onValueChange,
  getDisplayLabel,
  getAccessibilityLabel,
  showSelectionBand = false,
  testID,
}: Props<T>) {
  const options = data as T[];
  const index = options.indexOf(value);
  const initialIndex = index >= 0 ? index : 0;

  const listRef = useRef<FlatList<T | "spacer">>(null);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const getDisplayLabelRef = useRef(getDisplayLabel);
  const getAccessibilityLabelRef = useRef(getAccessibilityLabel);
  valueRef.current = value;
  onValueChangeRef.current = onValueChange;
  getDisplayLabelRef.current = getDisplayLabel;
  getAccessibilityLabelRef.current = getAccessibilityLabel;

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      const optionIndex = Math.round(y / NUTRITION_WHEEL_ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(options.length - 1, optionIndex));
      const newVal = options[clamped];
      if (newVal !== undefined && newVal !== valueRef.current) onValueChangeRef.current(newVal);
    },
    [options],
  );

  const listData = useMemo(() => ["spacer" as const, ...options, "spacer" as const], [options]);

  const renderItem = useCallback(
    ({ item }: { item: T | "spacer" }) => {
      if (item === "spacer") return <View style={styles.spacer} />;
      const displayLabel = getDisplayLabelRef.current(item);
      const isSelected = item === valueRef.current;
      return (
        <WheelRow
          item={item}
          isSelected={isSelected}
          displayLabel={displayLabel}
          accessibilityLabel={getAccessibilityLabelRef.current(item)}
          onSelectRef={onValueChangeRef as React.MutableRefObject<(v: T) => void>}
          {...(testID ? { testID: `${testID}-value-${displayLabel}` } : {})}
        />
      );
    },
    [testID],
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => {
      const n = options.length;
      const length =
        i === 0 || i === n + 1 ? NUTRITION_WHEEL_PADDING : NUTRITION_WHEEL_ITEM_HEIGHT;
      const offset =
        i === 0
          ? 0
          : i === n + 1
            ? NUTRITION_WHEEL_PADDING + n * NUTRITION_WHEEL_ITEM_HEIGHT
            : NUTRITION_WHEEL_PADDING + (i - 1) * NUTRITION_WHEEL_ITEM_HEIGHT;
      return { length, offset, index: i };
    },
    [options.length],
  );

  return (
    <View style={styles.container} testID={testID}>
      {showSelectionBand ? <View style={styles.selectionBand} pointerEvents="none" /> : null}
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(_, i) => `wheel-${i}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        contentOffset={{ x: 0, y: initialIndex * NUTRITION_WHEEL_ITEM_HEIGHT }}
        extraData={value}
        initialNumToRender={Math.min(listData.length, 15)}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        snapToInterval={NUTRITION_WHEEL_ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: NUTRITION_WHEEL_VISIBLE_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  selectionBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: NUTRITION_WHEEL_PADDING,
    height: NUTRITION_WHEEL_ITEM_HEIGHT,
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 132, 255, 0.22)",
    zIndex: 1,
  },
  list: { flex: 1 },
  spacer: { height: NUTRITION_WHEEL_PADDING },
  item: {
    height: NUTRITION_WHEEL_ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  itemText: {
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  itemTextActive: {
    fontSize: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    opacity: 1,
  },
  itemTextSubdued: {
    fontSize: 20,
    fontWeight: "400",
    color: UI_TEXT_MUTED,
    opacity: 0.55,
  },
});
