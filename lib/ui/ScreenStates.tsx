// lib/ui/ScreenStates.tsx
/**
 * Sprint 3 — Shared UI primitives for fail-closed, loading, empty states.
 * Apple Health / Linear baseline: restrained, typography-led.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type ScreenContainerProps = {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
};

export function ScreenContainer({ children, edges = ["top"] }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

export type ErrorStateProps = {
  title?: string;
  message: string;
  requestId?: string | null;
  onRetry?: () => void;
  /** Set when kind:"contract" for user-friendly data validation message */
  isContractError?: boolean;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  requestId,
  onRetry,
  isContractError = false,
}: ErrorStateProps) {
  const displayTitle = isContractError ? "Data validation failed" : title;
  const displayMessage = isContractError
    ? "The data received doesn't match expected format. Please try again."
    : message;

  return (
    <View style={styles.stateContainer}>
      <Text style={styles.errorTitle}>{displayTitle}</Text>
      <Text style={styles.errorMessage}>{displayMessage}</Text>
      {requestId ? (
        <Text style={styles.requestId}>Request ID: {requestId}</Text>
      ) : null}
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="small" color="#1C1C1E" />
      <Text style={styles.loadingMessage}>{message}</Text>
    </View>
  );
}

export type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.stateContainer}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, padding: 16 },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: "#3C3C43",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 22,
  },
  requestId: {
    fontSize: 12,
    color: "#8E8E93",
    fontFamily: "monospace",
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  loadingMessage: {
    fontSize: 15,
    color: "#8E8E93",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
});
