/**
 * Delete Account flow UI (Stage 1C).
 */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import type { AccountDeletionHookResult } from "@/lib/data/user-data/accountDeletion/useAccountDeletion";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const UI_DESTRUCTIVE = "#FF3B30";

type Step = "consequences" | "reauth" | "confirm" | "pending";

export type DeleteAccountScreenContentProps = {
  deletion: AccountDeletionHookResult;
};

export function DeleteAccountScreenContent({ deletion }: DeleteAccountScreenContentProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(
    deletion.deletionAccepted ? "pending" : "consequences",
  );
  const [password, setPassword] = useState("");

  const clearPassword = useCallback(() => setPassword(""), []);

  const onReauthContinue = useCallback(async () => {
    const ok = await deletion.reauthenticate(password);
    clearPassword();
    if (ok) setStep("confirm");
  }, [deletion, password, clearPassword]);

  const onConfirmDelete = useCallback(async () => {
    const ok = await deletion.submitDeletion();
    if (ok) setStep("pending");
  }, [deletion]);

  if (deletion.deletionState.status === "locally_completed") {
    return (
      <ModuleScreenShell title="Delete Account" subtitle="Deletion requested" hideTitleChrome>
        <View style={styles.body} accessibilityLabel="Account deletion signed out">
          <Text style={styles.lead}>
            Your account deletion was requested. You have been signed out. Processing may take a
            little time to finish on our servers.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to sign in"
            onPress={() => router.replace("/(auth)/sign-in")}
            style={styles.primaryCta}
          >
            <Text style={styles.primaryCtaLabel}>Return to Sign In</Text>
          </Pressable>
        </View>
      </ModuleScreenShell>
    );
  }

  if (step === "pending" || deletion.deletionAccepted) {
    return (
      <ModuleScreenShell title="Delete Account" subtitle="Deletion pending" hideTitleChrome>
        <View style={styles.body} accessibilityLiveRegion="polite" accessibilityLabel="Deletion pending">
          <Text style={styles.lead}>
            Your account deletion was requested. It is not complete yet — we are processing the
            request. You have been signed out of the app.
          </Text>
          {deletion.error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {deletion.error}
            </Text>
          ) : null}
          {deletion.deletionState.status === "cleanup_required" && deletion.errorRetryable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry local cleanup"
              onPress={() => void deletion.retryLocalCleanup()}
              style={styles.primaryCta}
            >
              <Text style={styles.primaryCtaLabel}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      </ModuleScreenShell>
    );
  }

  return (
    <ModuleScreenShell title="Delete Account" subtitle="Permanent action" hideTitleChrome>
      <View style={styles.body}>
        {step === "consequences" ? (
          <View style={styles.panel} accessibilityLabel="Deletion consequences">
            <Text style={styles.panelTitle}>This is permanent</Text>
            <Text style={styles.panelBody}>
              Deleting your account removes access to Oli and deletes user-scoped data covered by
              our deletion system. This cannot be undone. Processing may be asynchronous.
            </Text>
            <Text style={styles.panelMuted}>
              Some limited operational records may be retained where required.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue to verify password"
              onPress={() => setStep("reauth")}
              style={styles.destructiveCta}
            >
              <Text style={styles.destructiveCtaLabel}>Continue</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel delete account"
              onPress={() => router.back()}
              style={styles.secondaryCta}
            >
              <Text style={styles.secondaryCtaLabel}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "reauth" ? (
          <View style={styles.panel} accessibilityLabel="Verify password">
            <Text style={styles.panelTitle}>Verify your password</Text>
            <Text style={styles.panelBody}>
              Enter your current password to confirm this is your account.
            </Text>
            <TextInput
              accessibilityLabel="Current password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              editable={!deletion.reauthing}
              importantForAutofill="yes"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            {deletion.error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {deletion.error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify password"
              disabled={deletion.reauthing || password.length === 0}
              onPress={() => void onReauthContinue()}
              style={[styles.primaryCta, (deletion.reauthing || password.length === 0) && styles.disabled]}
            >
              {deletion.reauthing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryCtaLabel}>Verify</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => {
                clearPassword();
                setStep("consequences");
              }}
              style={styles.secondaryCta}
            >
              <Text style={styles.secondaryCtaLabel}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "confirm" ? (
          <View style={styles.panel} accessibilityLabel="Final confirmation">
            <Text style={styles.panelTitle}>Delete your account?</Text>
            <Text style={styles.panelBody}>
              This will request permanent deletion of your account and covered data. You will be
              signed out immediately after the request is accepted.
            </Text>
            {deletion.error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {deletion.error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account permanently"
              disabled={deletion.submitting}
              onPress={() => void onConfirmDelete()}
              style={[styles.destructiveCta, deletion.submitting && styles.disabled]}
            >
              {deletion.submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.destructiveCtaLabel}>Delete Account</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel delete account"
              disabled={deletion.submitting}
              onPress={() => setStep("reauth")}
              style={styles.secondaryCta}
            >
              <Text style={styles.secondaryCtaLabel}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}

const MIN_TAP = 44;

const styles = StyleSheet.create({
  body: { gap: 12 },
  panel: {
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: "800", color: UI_TEXT_PRIMARY },
  panelBody: { fontSize: 14, lineHeight: 20, color: UI_TEXT_PRIMARY },
  panelMuted: { fontSize: 13, lineHeight: 18, color: UI_TEXT_SECONDARY },
  lead: { fontSize: 15, lineHeight: 22, color: UI_TEXT_PRIMARY },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
    minHeight: MIN_TAP,
  },
  error: { fontSize: 14, color: UI_DESTRUCTIVE, lineHeight: 20 },
  primaryCta: {
    backgroundColor: "#111",
    minHeight: MIN_TAP,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaLabel: { color: "#fff", fontWeight: "800" },
  destructiveCta: {
    backgroundColor: UI_DESTRUCTIVE,
    minHeight: MIN_TAP,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveCtaLabel: { color: "#fff", fontWeight: "800" },
  secondaryCta: {
    minHeight: MIN_TAP,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCtaLabel: { color: UI_TEXT_SECONDARY, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
