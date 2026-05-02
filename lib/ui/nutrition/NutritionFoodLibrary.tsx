import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NutritionMetaDto } from "@oli/contracts/nutritionMeta";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { NutritionFoodSearchQueryStatus } from "@/lib/hooks/useNutritionFoodSearchQuery";
import { WorkoutsNavBar } from "@/lib/ui/headers/WorkoutsNavBar";
import { headerChromeCircleShell, headerChromeShadow } from "@/lib/ui/headerChrome";
import { UI_HEADER_CHROME_BG, UI_HEADER_CHROME_BORDER } from "@/lib/ui/theme/uiTokens";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { foodItemMetaFingerprint } from "@/lib/hooks/useNutritionMeta";
import { WORKOUT_LOGGER_COLORS } from "@/lib/workouts/ui/workoutLoggerTheme";

export type NutritionFoodLibraryTab = "recent" | "meals" | "foods";

export type FoodLibraryListRow =
  | { key: string; variant: "dto"; food: NutritionFoodSearchItemDto }
  | { key: string; variant: "meta"; ref: NutritionMetaDto["recentFoods"][number] };

export type NutritionFoodLibraryProps = {
  dayKey: DayKey;
  onBackPress: () => void;
  showLoggedBanner: boolean;
  onDismissLoggedBanner: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  searchStatus: NutritionFoodSearchQueryStatus;
  searchErrorMessage: string | null;
  onRetrySearch: () => void;
  activeTab: NutritionFoodLibraryTab;
  onTabChange: (t: NutritionFoodLibraryTab) => void;
  listRows: FoodLibraryListRow[];
  metaLoading: boolean;
  quickLoggingFoodId: string | null;
  addedFoodHashes: ReadonlySet<string>;
  onPressRow: (row: FoodLibraryListRow) => void;
  onPressRowAdd: (row: FoodLibraryListRow) => void;
  onScanBarcode: () => void;
  onQuickAddMacros: () => void;
  onOpenCreateMenu: () => void;
  onOpenFilter: () => void;
};

function formatMacroLine(food: NutritionFoodSearchItemDto): string {
  const kcal = Math.round(food.caloriesKcal);
  const p = Math.round(food.proteinG * 10) / 10;
  const c = Math.round(food.carbsG * 10) / 10;
  const f = Math.round(food.fatG * 10) / 10;
  return `${food.servingLabel} · ${kcal} kcal · P ${p} · C ${c} · F ${f}`;
}

export function NutritionFoodLibrary(props: NutritionFoodLibraryProps) {
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);
  const isSearching = props.query.trim().length > 0;

  const headerSearchSlot = useMemo(
    () => (
      <View style={styles.navSearchShell} pointerEvents="box-none">
        <Ionicons name="search" size={22} color={WORKOUT_LOGGER_COLORS.textSecondaryMuted} />
        <TextInput
          value={props.query}
          onChangeText={props.onQueryChange}
          placeholder="Search foods"
          placeholderTextColor={WORKOUT_LOGGER_COLORS.textSecondary}
          style={styles.navSearchInput}
          accessibilityRole="search"
          accessibilityLabel="Search foods"
          testID="food-library-search-input"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {props.query.length > 0 ? (
          <Pressable
            onPress={() => props.onQueryChange("")}
            style={styles.navClearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Text style={styles.navClearBtnText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    ),
    [props.query, props.onQueryChange],
  );

  const tabStrip = useMemo(
    () => (
      <View style={styles.tabRow} accessibilityRole="tablist">
        {(
          [
            { id: "recent" as const, label: "Recent", a11y: "Recent foods tab" },
            { id: "meals" as const, label: "My Meals", a11y: "My meals tab" },
            { id: "foods" as const, label: "My Foods", a11y: "My foods tab" },
          ] as const
        ).map((t) => {
          const selected = props.activeTab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => props.onTabChange(t.id)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.tabPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t.a11y}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    ),
    [props.activeTab, props.onTabChange],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        {props.showLoggedBanner ? (
          <View style={styles.loggedBanner} accessibilityRole="summary">
            <Text style={styles.loggedTitle}>Meal logged</Text>
            <Text style={styles.loggedSub}>Totals update as your data syncs.</Text>
            <Pressable
              onPress={props.onDismissLoggedBanner}
              accessibilityRole="button"
              accessibilityLabel="Dismiss meal logged message"
              hitSlop={8}
              style={({ pressed }) => [styles.dismissLogged, pressed && styles.pressed]}
            >
              <Text style={styles.dismissLoggedText}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        {!isSearching ? tabStrip : null}

        {!isSearching ? (
          <View style={styles.primaryActions}>
            <Pressable
              onPress={props.onScanBarcode}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode"
              testID="food-library-scan-barcode"
            >
              <Ionicons name="barcode-outline" size={22} color={NUTRITION_ACCENT} />
              <Text style={styles.primaryBtnText}>Scan Barcode</Text>
            </Pressable>
            <Pressable
              onPress={props.onQuickAddMacros}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Quick add macros"
              testID="food-library-quick-add"
            >
              <Ionicons name="flash-outline" size={22} color={NUTRITION_ACCENT} />
              <Text style={styles.primaryBtnText}>Quick Add</Text>
            </Pressable>
          </View>
        ) : null}

        {!isSearching ? (
          <View style={styles.historyHead}>
            <Text style={styles.historyTitle}>History</Text>
            <Pressable
              onPress={props.onOpenFilter}
              style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Filter history"
              testID="food-library-filter"
            >
              <Text style={styles.filterBtnText}>Filter</Text>
            </Pressable>
          </View>
        ) : null}

        {props.searchStatus === "loading" && isSearching ? (
          <View style={styles.loadingBanner} accessibilityLabel="Searching foods">
            <ActivityIndicator size="small" color={SYSTEM_ACCENT} />
            <Text style={styles.loadingLabel}>Searching…</Text>
          </View>
        ) : null}

        {props.searchStatus === "error" && isSearching ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorTitle}>Could not search</Text>
            <Text style={styles.errorBody}>{props.searchErrorMessage ?? "Something went wrong."}</Text>
            <Pressable
              onPress={props.onRetrySearch}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry search"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ),
    [
      props.showLoggedBanner,
      props.onDismissLoggedBanner,
      props.onScanBarcode,
      props.onQuickAddMacros,
      props.onOpenFilter,
      props.searchStatus,
      props.searchErrorMessage,
      props.onRetrySearch,
      isSearching,
      tabStrip,
    ],
  );

  const empty = useMemo(() => {
    if (props.metaLoading && !isSearching && props.activeTab === "recent") {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator color={SYSTEM_ACCENT} />
          <Text style={styles.emptyBody}>Loading your foods…</Text>
        </View>
      );
    }
    if (isSearching && props.searchStatus === "success" && props.listRows.length === 0) {
      return (
        <View style={styles.centerBox} accessibilityRole="text">
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyBody}>Try another name or scan a barcode.</Text>
        </View>
      );
    }
    if (!isSearching && props.activeTab === "recent" && props.listRows.length === 0) {
      return (
        <View style={styles.centerBox} accessibilityRole="text">
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyBody}>Search or scan to add foods. Items you log appear here.</Text>
        </View>
      );
    }
    if (!isSearching && props.activeTab === "meals") {
      return (
        <View style={styles.centerBox} accessibilityRole="text">
          <Text style={styles.emptyTitle}>No saved meals</Text>
          <Text style={styles.emptyBody}>
            Saved meals will appear here. Create reusable meals from foods you log often.
          </Text>
        </View>
      );
    }
    if (!isSearching && props.activeTab === "foods") {
      return (
        <View style={styles.centerBox} accessibilityRole="text">
          <Text style={styles.emptyTitle}>No custom foods</Text>
          <Text style={styles.emptyBody}>Custom foods will appear here. Tap + to create a food.</Text>
        </View>
      );
    }
    return null;
  }, [
    props.metaLoading,
    props.activeTab,
    props.listRows.length,
    props.searchStatus,
    isSearching,
  ]);

  const renderRow = ({ item }: { item: FoodLibraryListRow }) => {
    const title =
      item.variant === "dto" ? item.food.name : item.ref.name;
    const sub =
      item.variant === "dto"
        ? item.food.brand ?? null
        : item.ref.brand ?? null;
    const metaLine =
      item.variant === "dto"
        ? formatMacroLine(item.food)
        : "Default serving · tap + to log";
    const fh =
      item.variant === "dto" ? foodItemMetaFingerprint(item.food) : item.ref.foodHash;
    const added = props.addedFoodHashes.has(fh);
    const busy = item.variant === "dto" && props.quickLoggingFoodId === item.food.id;
    const busyMeta = item.variant === "meta" && props.quickLoggingFoodId === item.ref.id;

    return (
      <View style={styles.row}>
        <Pressable
          onPress={() => props.onPressRow(item)}
          style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Open food ${title}`}
        >
          <View style={styles.thumb} accessibilityElementsHidden>
            <Ionicons name="nutrition-outline" size={22} color="#636366" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {title}
            </Text>
            {sub ? (
              <Text style={styles.rowSub} numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
            <Text style={styles.rowMeta} numberOfLines={2}>
              {metaLine}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => props.onPressRowAdd(item)}
          disabled={busy || busyMeta}
          style={({ pressed }) => [
            styles.addBtn,
            (busy || busyMeta) && styles.addBtnBusy,
            pressed && !busy && !busyMeta && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={added ? `Added ${title}` : `Log ${title}`}
          accessibilityState={{ disabled: busy || busyMeta }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={`food-library-row-add-${item.key}`}
        >
          {busy || busyMeta ? (
            <ActivityIndicator size="small" color={NUTRITION_ACCENT} />
          ) : added ? (
            <Text style={styles.addedLabel}>Added</Text>
          ) : (
            <Ionicons name="add" size={26} color={NUTRITION_ACCENT} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.screen}>
          <WorkoutsNavBar
            hideTitle
            surface="flush"
            contentPaddingHorizontal={16}
            rowMinHeight={56}
            leftColumnWidth={56}
            backButtonSize="large"
            centerSlotLayout="fill"
            onBackPress={props.onBackPress}
            centerSlot={headerSearchSlot}
            rightSlot={
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={styles.navCreateIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Create food or meal"
                testID="food-library-create-button"
              >
                <Ionicons name="add-circle-outline" size={26} color="#1C1C1E" />
              </Pressable>
            }
            rightSlotWidth={56}
          />
          <View style={styles.listWrap}>
            <FlatList
              style={styles.listFill}
              data={props.listRows}
              keyExtractor={(row) => row.key}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={empty}
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 + insets.bottom, flexGrow: 1 }}
            />
          </View>
        </View>
      </SafeAreaView>

      <Modal visible={createOpen} animationType="fade" transparent onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)} accessibilityLabel="Dismiss">
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create</Text>
            <Pressable
              style={({ pressed }) => [styles.modalRow, styles.modalRowDisabled, pressed && styles.pressed]}
              disabled
              accessibilityRole="button"
              accessibilityLabel="Create food coming soon"
              accessibilityState={{ disabled: true }}
            >
              <Text style={styles.modalRowTitle}>Food</Text>
              <Text style={styles.modalRowSub}>Coming soon</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setCreateOpen(false);
                props.onOpenCreateMenu();
              }}
              style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Build meal from items"
            >
              <Text style={styles.modalRowTitle}>Meal</Text>
              <Text style={styles.modalRowSub}>Combine foods for today</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalRow, styles.modalRowDisabled, pressed && styles.pressed]}
              disabled
              accessibilityRole="button"
              accessibilityLabel="Recipe coming soon"
              accessibilityState={{ disabled: true }}
            >
              <Text style={styles.modalRowTitle}>Recipe</Text>
              <Text style={styles.modalRowSub}>Coming soon</Text>
            </Pressable>
            <Pressable
              onPress={() => setCreateOpen(false)}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close create menu"
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
  },
  screen: {
    flex: 1,
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
  },
  navSearchShell: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: UI_HEADER_CHROME_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_HEADER_CHROME_BORDER,
    ...headerChromeShadow,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
  },
  navSearchInput: {
    flex: 1,
    minWidth: 0,
    flexGrow: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    color: WORKOUT_LOGGER_COLORS.textPrimary,
  },
  navClearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  navClearBtnText: {
    fontSize: 14,
    color: SYSTEM_ACCENT,
    fontWeight: "600",
  },
  navCreateIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...headerChromeCircleShell,
  },
  listWrap: { flex: 1, minHeight: 0 },
  listFill: { flex: 1 },
  headerBlock: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  loggedBanner: {
    backgroundColor: "rgba(52, 199, 89, 0.14)",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  loggedTitle: { fontSize: 16, fontWeight: "700", color: "#1C1C1E" },
  loggedSub: { fontSize: 14, color: "#636366", lineHeight: 20 },
  dismissLogged: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  dismissLoggedText: { fontSize: 16, fontWeight: "600", color: NUTRITION_ACCENT },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabPressed: { opacity: 0.88 },
  tabText: { fontSize: 13, fontWeight: "600", color: "#636366", textAlign: "center" },
  tabTextSelected: { color: NUTRITION_ACCENT },
  primaryActions: { flexDirection: "row", gap: 12 },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.35)",
    backgroundColor: "rgba(0, 122, 255, 0.08)",
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: NUTRITION_ACCENT },
  historyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#636366",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  filterBtn: { minHeight: 44, paddingHorizontal: 8, justifyContent: "center" },
  filterBtnText: { fontSize: 16, fontWeight: "600", color: SYSTEM_ACCENT },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingLabel: { fontSize: 15, color: "#636366" },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 59, 48, 0.08)",
    gap: 8,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#C62828" },
  errorBody: { fontSize: 15, color: "#1C1C1E", lineHeight: 22 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 8 },
  retryText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  centerBox: { padding: 24, gap: 10, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1C1C1E", textAlign: "center" },
  emptyBody: { fontSize: 16, color: "#636366", lineHeight: 22, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60, 60, 67, 0.18)",
    minHeight: 72,
    paddingHorizontal: 16,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minWidth: 0,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  rowSub: { fontSize: 14, color: "#636366" },
  rowMeta: { fontSize: 13, color: "#8E8E93" },
  addBtn: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  addBtnBusy: { opacity: 0.85 },
  addedLabel: { fontSize: 13, fontWeight: "700", color: "#34C759" },
  pressed: { opacity: 0.72 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  modalCard: {
    marginHorizontal: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  modalRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 4,
    minHeight: 56,
    justifyContent: "center",
  },
  modalRowDisabled: { opacity: 0.45 },
  modalRowTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  modalRowSub: { fontSize: 14, color: "#636366" },
  modalClose: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 8,
  },
  modalCloseText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
});
