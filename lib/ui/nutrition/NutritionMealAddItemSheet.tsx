import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NutritionLogHub, type NutritionLogHubMode } from "@/lib/ui/nutrition/NutritionLogHub";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_OVERLAY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  visible: boolean;
  onSelectMode: (mode: NutritionLogHubMode) => void;
  onClose: () => void;
};

/**
 * Bottom-sheet chooser for "Add item" in the meal builder. Reuses {@link NutritionLogHub} so it
 * looks and behaves like the Log Nutrition hub, but selections add to the meal draft rather than
 * logging to the day (routing is owned by the caller).
 */
export function NutritionMealAddItemSheet({ visible, onSelectMode, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss add food"
          onPress={onClose}
        />
        <View style={styles.sheet} testID="meal-add-item-sheet">
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            Add food to meal
          </Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <NutritionLogHub
              onSelectMode={onSelectMode}
              lede="Choose how to add a food to this meal."
              testID="meal-add-item-hub"
            />
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel add food"
            testID="meal-add-item-cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: UI_OVERLAY, justifyContent: "flex-end" },
  backdropPress: { flex: 1 },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 12,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "700", color: UI_TEXT_PRIMARY, letterSpacing: -0.3 },
  scroll: { flexGrow: 0 },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: UI_TEXT_SECONDARY, fontSize: 16, fontWeight: "500" },
  pressed: { opacity: 0.65 },
});
