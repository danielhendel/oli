// lib/ui/onboarding/AboutYouScreenContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ABOUT_YOU_COPY } from "@/lib/onboarding/constants";
import type { AboutYouDraft, AboutYouFieldErrors } from "@/lib/onboarding/types";
import type { ProfileSexAtBirth } from "@oli/contracts";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

import { OnboardingScreenShell, onboardingCtaStyles } from "./OnboardingScreenShell";

const SEX_OPTIONS: { value: ProfileSexAtBirth; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "unspecified", label: "Prefer not to say" },
];

export type AboutYouScreenContentProps = {
  draft: AboutYouDraft;
  errors: AboutYouFieldErrors;
  submitting: boolean;
  bannerError: string | null;
  onChange: (patch: Partial<AboutYouDraft>) => void;
  onSubmit: () => void;
};

export function AboutYouScreenContent({
  draft,
  errors,
  submitting,
  bannerError,
  onChange,
  onSubmit,
}: AboutYouScreenContentProps) {
  return (
    <OnboardingScreenShell
      title={ABOUT_YOU_COPY.title}
      subtitle={ABOUT_YOU_COPY.subtitle}
      stepIndex={1}
      footer={
        <>
          {bannerError ? <Text style={onboardingCtaStyles.error}>{bannerError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ABOUT_YOU_COPY.continueCta}
            disabled={submitting}
            onPress={onSubmit}
            style={[onboardingCtaStyles.primary, submitting ? onboardingCtaStyles.primaryDisabled : null]}
          >
            <Text style={onboardingCtaStyles.primaryLabel}>
              {submitting ? "Saving…" : ABOUT_YOU_COPY.continueCta}
            </Text>
          </Pressable>
        </>
      }
    >
      <Field label="Preferred name" error={errors.preferredName}>
        <TextInput
          value={draft.preferredName}
          onChangeText={(preferredName) => onChange({ preferredName })}
          placeholder="What should we call you?"
          placeholderTextColor={UI_TEXT_MUTED}
          style={styles.input}
          autoCapitalize="words"
          editable={!submitting}
        />
      </Field>

      <Field label="Date of birth" error={errors.dateOfBirth}>
        <TextInput
          value={draft.dateOfBirth}
          onChangeText={(dateOfBirth) => onChange({ dateOfBirth })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={UI_TEXT_MUTED}
          style={styles.input}
          autoCapitalize="none"
          editable={!submitting}
        />
      </Field>

      <Field label="Sex used for health interpretation" error={errors.sexAtBirth}>
        <Text style={styles.hint}>{ABOUT_YOU_COPY.sexHint}</Text>
        <View style={styles.chipRow}>
          {SEX_OPTIONS.map((opt) => {
            const selected = draft.sexAtBirth === opt.value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange({ sexAtBirth: opt.value })}
                style={[styles.chip, selected ? styles.chipSelected : null]}
                disabled={submitting}
              >
                <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Height" error={errors.height}>
        <View style={styles.unitToggle}>
          <Pressable
            onPress={() => onChange({ lengthUnit: "cm" })}
            style={[styles.unitBtn, draft.lengthUnit === "cm" ? styles.unitBtnOn : null]}
          >
            <Text style={styles.unitBtnLabel}>cm</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange({ lengthUnit: "in" })}
            style={[styles.unitBtn, draft.lengthUnit === "in" ? styles.unitBtnOn : null]}
          >
            <Text style={styles.unitBtnLabel}>ft/in</Text>
          </Pressable>
        </View>
        {draft.lengthUnit === "cm" ? (
          <TextInput
            value={draft.heightCm}
            onChangeText={(heightCm) => onChange({ heightCm })}
            placeholder="175"
            placeholderTextColor={UI_TEXT_MUTED}
            keyboardType="decimal-pad"
            style={styles.input}
            editable={!submitting}
          />
        ) : (
          <View style={styles.row}>
            <TextInput
              value={draft.heightFeet}
              onChangeText={(heightFeet) => onChange({ heightFeet })}
              placeholder="ft"
              placeholderTextColor={UI_TEXT_MUTED}
              keyboardType="number-pad"
              style={[styles.input, styles.half]}
              editable={!submitting}
            />
            <TextInput
              value={draft.heightInches}
              onChangeText={(heightInches) => onChange({ heightInches })}
              placeholder="in"
              placeholderTextColor={UI_TEXT_MUTED}
              keyboardType="number-pad"
              style={[styles.input, styles.half]}
              editable={!submitting}
            />
          </View>
        )}
      </Field>

      <Field label="Weight (optional)" error={errors.weight}>
        <View style={styles.unitToggle}>
          <Pressable
            onPress={() => onChange({ weightUnit: "kg" })}
            style={[styles.unitBtn, draft.weightUnit === "kg" ? styles.unitBtnOn : null]}
          >
            <Text style={styles.unitBtnLabel}>kg</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange({ weightUnit: "lb" })}
            style={[styles.unitBtn, draft.weightUnit === "lb" ? styles.unitBtnOn : null]}
          >
            <Text style={styles.unitBtnLabel}>lb</Text>
          </Pressable>
        </View>
        <TextInput
          value={draft.weightValue}
          onChangeText={(weightValue) => onChange({ weightValue })}
          placeholder="Optional"
          placeholderTextColor={UI_TEXT_MUTED}
          keyboardType="decimal-pad"
          style={styles.input}
          editable={!submitting}
        />
      </Field>
    </OnboardingScreenShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  hint: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    color: UI_TEXT_PRIMARY,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fieldError: {
    color: "#FF6B6B",
    marginTop: 6,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: "#3A5BDB",
    backgroundColor: "rgba(58,91,219,0.18)",
  },
  chipLabel: { color: UI_TEXT_SECONDARY, fontWeight: "600" },
  chipLabelSelected: { color: UI_TEXT_PRIMARY },
  unitToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  unitBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    justifyContent: "center",
  },
  unitBtnOn: {
    borderColor: "#3A5BDB",
    backgroundColor: "rgba(58,91,219,0.18)",
  },
  unitBtnLabel: { color: UI_TEXT_PRIMARY, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
});
