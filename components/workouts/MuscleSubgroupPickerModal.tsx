import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";

import type { MuscleGroup, MuscleSubgroup } from "@/lib/workouts/exercises/taxonomy";
import { subgroupToGroupMap } from "@/lib/workouts/exercises/taxonomy";

const GROUP_ORDER: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

const SUBGROUPS_SORTED: MuscleSubgroup[] = (Object.keys(subgroupToGroupMap) as MuscleSubgroup[]).sort((a, b) =>
  a.localeCompare(b),
);

function formatGroupTitle(g: MuscleGroup): string {
  return g.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSubgroupRow(sg: MuscleSubgroup): string {
  return sg.replace(/_/g, " ");
}

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  onSelect: (sg: MuscleSubgroup) => void;
};

export function MuscleSubgroupPickerModal({ visible, onRequestClose, onSelect }: Props): React.ReactElement {
  const sections = useMemo(() => {
    const byGroup = new Map<MuscleGroup, MuscleSubgroup[]>();
    for (const g of GROUP_ORDER) byGroup.set(g, []);
    for (const sg of SUBGROUPS_SORTED) {
      const g = subgroupToGroupMap[sg];
      const list = byGroup.get(g);
      if (list) list.push(sg);
    }
    return GROUP_ORDER.map((g) => ({ group: g, subgroups: byGroup.get(g) ?? [] })).filter((s) => s.subgroups.length > 0);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose} accessibilityLabel="Close muscle picker">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView style={styles.safe}>
            <View style={styles.grabber} />
            <Text style={styles.title}>Choose muscle (predefined)</Text>
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {sections.map(({ group, subgroups }) => (
                <View key={group} style={styles.section}>
                  <Text style={styles.sectionTitle}>{formatGroupTitle(group)}</Text>
                  {subgroups.map((sg) => (
                    <Pressable
                      key={sg}
                      onPress={() => {
                        onSelect(sg);
                        onRequestClose();
                      }}
                      style={styles.row}
                      accessibilityRole="button"
                      accessibilityLabel={formatSubgroupRow(sg)}
                    >
                      <Text style={styles.rowText}>{formatSubgroupRow(sg)}</Text>
                      <Text style={styles.rowMeta}>{sg}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={onRequestClose} style={styles.doneBtn} accessibilityRole="button">
              <Text style={styles.doneBtnText}>Cancel</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#F2F2F7",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  safe: { flex: 1 },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C6C6C8",
    marginTop: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1C1C1E",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scroll: { flex: 1, paddingHorizontal: 12 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  rowText: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  rowMeta: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  doneBtn: {
    margin: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
  },
  doneBtnText: { fontSize: 16, fontWeight: "700", color: "#1C1C1E" },
});
