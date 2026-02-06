// components/failures/FailureDetailsModal.tsx
import React, { useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import type { FailureListItemDto } from "@/lib/contracts/failure";

function formatLocalDateTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString();
}

function formatDetails(details: FailureListItemDto["details"]): string {
  if (!details || typeof details !== "object") return "—";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export type FailureDetailsModalProps = {
  item: FailureListItemDto;
  onClose: () => void;
};

export function FailureDetailsModal({ item, onClose }: FailureDetailsModalProps) {
  const detailsStr = useMemo(() => formatDetails(item.details), [item.details]);

  return (
    <Modal visible transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Failure details</Text>

            <View style={styles.row}>
              <Text style={styles.label}>ID</Text>
              <Text style={styles.value}>{item.id}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Timestamp</Text>
              <Text style={styles.value}>{formatLocalDateTime(item.createdAt)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{item.type}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Day</Text>
              <Text style={styles.value}>{item.day}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Code</Text>
              <Text style={styles.value}>{item.code}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Message</Text>
              <Text style={styles.value}>{item.message}</Text>
            </View>

            {item.rawEventId ? (
              <View style={styles.row}>
                <Text style={styles.label}>Raw event ID</Text>
                <Text style={styles.value}>{item.rawEventId}</Text>
              </View>
            ) : null}

            {item.rawEventPath ? (
              <View style={styles.row}>
                <Text style={styles.label}>Raw event path</Text>
                <Text style={styles.value}>{item.rawEventPath}</Text>
              </View>
            ) : null}

            {item.details ? (
              <View style={styles.row}>
                <Text style={styles.label}>Details</Text>
                <Text style={[styles.value, styles.detailsBlock]}>{detailsStr}</Text>
              </View>
            ) : null}

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxWidth: 400,
    width: "100%",
    maxHeight: "80%",
  },
  scroll: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.8,
  },
  value: {
    fontSize: 14,
    color: "#1C1C1E",
  },
  detailsBlock: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
