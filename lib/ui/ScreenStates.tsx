// lib/ui/ScreenStates.tsx
/**
 * Sprint 3 — Shared UI primitives for fail-closed, loading, empty states.
 * Apple Health / Linear baseline: restrained, typography-led.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UI_APP_SCREEN_BG, UI_SCREEN_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

export type ScreenContainerProps = {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  backgroundColor?: string;
  padded?: boolean;
};

export function ScreenContainer({
  children,
  edges = ["top"],
  backgroundColor = UI_APP_SCREEN_BG,
  padded = true,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      <View style={[styles.container, !padded && styles.containerNoPadding]}>{children}</View>
    </SafeAreaView>
  );
}

export type ErrorStateSecondaryAction = {
  label: string;
  onPress: () => void;
};

export type ErrorStateProps = {
  title?: string;
  message: string;
  requestId?: string | null;
  onRetry?: () => void;
  /** Optional second action (e.g. "Open Settings") */
  secondaryAction?: ErrorStateSecondaryAction;
  /** Set when kind:"contract" for user-friendly data validation message */
  isContractError?: boolean;
  /** `inline` avoids flex:1 so the block can sit inside cards */
  variant?: "screen" | "inline";
};

export function ErrorState({
  title = "Something went wrong",
  message,
  requestId,
  onRetry,
  secondaryAction,
  isContractError = false,
  variant = "screen",
}: ErrorStateProps) {
  const displayTitle = isContractError ? "Data validation failed" : title;
  const displayMessage = isContractError
    ? "The data received doesn't match expected format. Please try again."
    : message;

  return (
    <View style={variant === "inline" ? styles.stateContainerInline : styles.stateContainer}>
      <Text style={styles.errorTitle}>{displayTitle}</Text>
      <Text style={styles.errorMessage}>{displayMessage}</Text>
      {__DEV__ && requestId ? (
        <Text style={styles.requestId}>Request ID: {requestId}</Text>
      ) : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityLabel="Try again"
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      ) : null}
      {secondaryAction ? (
        <Pressable
          onPress={secondaryAction.onPress}
          style={styles.retryBtn}
          accessibilityLabel={secondaryAction.label}
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>{secondaryAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type LoadingStateProps = {
  message?: string;
  variant?: "screen" | "inline";
};

export function LoadingState({ message = "Loading…", variant = "screen" }: LoadingStateProps) {
  return (
    <View style={variant === "inline" ? styles.stateContainerInline : styles.stateContainer}>
      <ActivityIndicator size="small" color={UI_TEXT_PRIMARY} />
      <Text style={styles.loadingMessage}>{message}</Text>
    </View>
  );
}

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Sprint 4 — Optional explanatory text (e.g. "Try a different date range") */
  explanation?: string;
};

export function EmptyState({ title, description, explanation }: EmptyStateProps) {
  return (
    <View style={styles.stateContainer}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
      {explanation ? (
        <Text style={styles.emptyExplanation}>{explanation}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  container: { flex: 1, padding: 16 },
  containerNoPadding: { padding: 0 },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  stateContainerInline: {
    flexGrow: 0,
    alignSelf: "stretch",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 10,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: UI_TEXT_SECONDARY,
    opacity: 0.95,
    textAlign: "center",
    lineHeight: 22,
  },
  requestId: {
    fontSize: 12,
    color: UI_TEXT_TERTIARY_LABEL,
    fontFamily: "monospace",
  },
  retryBtn: {
    marginTop: 8,
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: UI_SCREEN_BG,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  loadingMessage: {
    fontSize: 15,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 15,
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyExplanation: {
    fontSize: 14,
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontStyle: "italic",
  },
});
