// lib/ui/onboarding/AboutYouScreenContent.tsx
import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInput as TextInputType } from "react-native";

import { ABOUT_YOU_COPY } from "@/lib/onboarding/constants";
import { sanitizeDobPartInput } from "@/lib/onboarding/dateOfBirthParts";
import type { AboutYouDraft, AboutYouFieldErrors } from "@/lib/onboarding/types";
import type { ProfileSexAtBirth } from "@oli/contracts";

import { OnboardingScreenShell, onboardingCtaStyles } from "./OnboardingScreenShell";
import { ONBOARDING_VISUAL } from "./onboardingVisualTokens";

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
  const dayRef = useRef<TextInputType>(null);
  const yearRef = useRef<TextInputType>(null);

  return (
    <OnboardingScreenShell
      title={ABOUT_YOU_COPY.title}
      ambient={false}
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
          placeholderTextColor={ONBOARDING_VISUAL.textMuted}
          style={styles.input}
          autoCapitalize="words"
          editable={!submitting}
          returnKeyType="next"
        />
      </Field>

      <View style={styles.dobGroup} accessibilityLabel={ABOUT_YOU_COPY.dobGroupLabel}>
        <Text style={styles.groupLabel}>{ABOUT_YOU_COPY.dobGroupLabel}</Text>
        <View style={styles.dobRow}>
          <View style={styles.dobMonth}>
            <Text style={styles.partLabel}>{ABOUT_YOU_COPY.dobMonthLabel}</Text>
            <TextInput
              value={draft.birthMonth}
              onChangeText={(raw) => {
                const birthMonth = sanitizeDobPartInput("month", raw);
                onChange({ birthMonth });
                if (birthMonth.length === 2) dayRef.current?.focus();
              }}
              placeholder={ABOUT_YOU_COPY.dobMonthPlaceholder}
              placeholderTextColor={ONBOARDING_VISUAL.textMuted}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              editable={!submitting}
              accessibilityLabel={ABOUT_YOU_COPY.dobMonthLabel}
            />
          </View>
          <View style={styles.dobDay}>
            <Text style={styles.partLabel}>{ABOUT_YOU_COPY.dobDayLabel}</Text>
            <TextInput
              ref={dayRef}
              value={draft.birthDay}
              onChangeText={(raw) => {
                const birthDay = sanitizeDobPartInput("day", raw);
                onChange({ birthDay });
                if (birthDay.length === 2) yearRef.current?.focus();
              }}
              placeholder={ABOUT_YOU_COPY.dobDayPlaceholder}
              placeholderTextColor={ONBOARDING_VISUAL.textMuted}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              editable={!submitting}
              accessibilityLabel={ABOUT_YOU_COPY.dobDayLabel}
            />
          </View>
          <View style={styles.dobYear}>
            <Text style={styles.partLabel}>{ABOUT_YOU_COPY.dobYearLabel}</Text>
            <TextInput
              ref={yearRef}
              value={draft.birthYear}
              onChangeText={(raw) => onChange({ birthYear: sanitizeDobPartInput("year", raw) })}
              placeholder={ABOUT_YOU_COPY.dobYearPlaceholder}
              placeholderTextColor={ONBOARDING_VISUAL.textMuted}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={4}
              editable={!submitting}
              accessibilityLabel={ABOUT_YOU_COPY.dobYearLabel}
            />
          </View>
        </View>
        {errors.dateOfBirth ? <Text style={styles.fieldError}>{errors.dateOfBirth}</Text> : null}
      </View>

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
            accessibilityState={{ selected: draft.lengthUnit === "cm" }}
          >
            <Text style={styles.unitBtnLabel}>cm</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange({ lengthUnit: "in" })}
            style={[styles.unitBtn, draft.lengthUnit === "in" ? styles.unitBtnOn : null]}
            accessibilityState={{ selected: draft.lengthUnit === "in" }}
          >
            <Text style={styles.unitBtnLabel}>ft/in</Text>
          </Pressable>
        </View>
        {draft.lengthUnit === "cm" ? (
          <TextInput
            value={draft.heightCm}
            onChangeText={(heightCm) => onChange({ heightCm })}
            placeholder="cm"
            placeholderTextColor={ONBOARDING_VISUAL.textMuted}
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
              placeholderTextColor={ONBOARDING_VISUAL.textMuted}
              keyboardType="number-pad"
              style={[styles.input, styles.half]}
              editable={!submitting}
            />
            <TextInput
              value={draft.heightInches}
              onChangeText={(heightInches) => onChange({ heightInches })}
              placeholder="in"
              placeholderTextColor={ONBOARDING_VISUAL.textMuted}
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
            accessibilityState={{ selected: draft.weightUnit === "kg" }}
          >
            <Text style={styles.unitBtnLabel}>kg</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange({ weightUnit: "lb" })}
            style={[styles.unitBtn, draft.weightUnit === "lb" ? styles.unitBtnOn : null]}
            accessibilityState={{ selected: draft.weightUnit === "lb" }}
          >
            <Text style={styles.unitBtnLabel}>lb</Text>
          </Pressable>
        </View>
        <TextInput
          value={draft.weightValue}
          onChangeText={(weightValue) => onChange({ weightValue })}
          placeholder="Optional"
          placeholderTextColor={ONBOARDING_VISUAL.textMuted}
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
  field: { marginBottom: 20 },
  label: {
    color: ONBOARDING_VISUAL.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  groupLabel: {
    color: ONBOARDING_VISUAL.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  partLabel: {
    color: ONBOARDING_VISUAL.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  hint: {
    color: ONBOARDING_VISUAL.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  input: {
    minHeight: ONBOARDING_VISUAL.minTap,
    borderRadius: ONBOARDING_VISUAL.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_VISUAL.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: ONBOARDING_VISUAL.textPrimary,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fieldError: {
    color: "#FF6B6B",
    marginTop: 6,
    fontSize: 13,
  },
  dobGroup: {
    marginBottom: 20,
    padding: 14,
    borderRadius: ONBOARDING_VISUAL.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_VISUAL.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  dobRow: {
    flexDirection: "row",
    gap: 10,
  },
  dobMonth: { flex: 1 },
  dobDay: { flex: 1 },
  dobYear: { flex: 1.35 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: ONBOARDING_VISUAL.minTap,
    paddingHorizontal: 12,
    borderRadius: ONBOARDING_VISUAL.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_VISUAL.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: ONBOARDING_VISUAL.accent,
    backgroundColor: ONBOARDING_VISUAL.accentWash,
  },
  chipLabel: { color: ONBOARDING_VISUAL.textSecondary, fontWeight: "600" },
  chipLabelSelected: { color: ONBOARDING_VISUAL.textPrimary },
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
    borderColor: ONBOARDING_VISUAL.border,
    justifyContent: "center",
  },
  unitBtnOn: {
    borderColor: ONBOARDING_VISUAL.accent,
    backgroundColor: ONBOARDING_VISUAL.accentWash,
  },
  unitBtnLabel: { color: ONBOARDING_VISUAL.textPrimary, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
});
