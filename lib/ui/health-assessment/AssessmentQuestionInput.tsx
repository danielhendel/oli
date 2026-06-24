// lib/ui/health-assessment/AssessmentQuestionInput.tsx
import React, { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type {
  AssessmentAnswerValue,
  AssessmentQuestion,
} from "@/lib/data/health-assessment/types";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type AssessmentQuestionInputProps = {
  question: AssessmentQuestion;
  value: AssessmentAnswerValue | undefined;
  onChange: (value: AssessmentAnswerValue) => void;
};

export function AssessmentQuestionInput({
  question,
  value,
  onChange,
}: AssessmentQuestionInputProps): React.ReactElement {
  switch (question.inputType) {
    case "single-select":
      return (
        <SelectInput
          question={question}
          value={typeof value === "string" ? value : null}
          multi={false}
          onChange={onChange}
        />
      );
    case "multi-select":
      return (
        <SelectInput
          question={question}
          value={Array.isArray(value) ? value : []}
          multi
          onChange={onChange}
        />
      );
    case "boolean":
      return (
        <SelectInput
          question={question}
          value={typeof value === "boolean" ? (value ? "yes" : "no") : null}
          multi={false}
          onChange={(v) => onChange(v === "yes")}
          booleanMode
        />
      );
    case "number":
      return <NumberInput question={question} value={value} onChange={onChange} />;
    case "text":
    case "date":
    case "year":
      return <TextInputField question={question} value={value} onChange={onChange} />;
    default: {
      const _exhaustive: never = question.inputType;
      return <Text style={styles.unsupported}>Unsupported input: {String(_exhaustive)}</Text>;
    }
  }
}

function SelectInput({
  question,
  value,
  multi,
  onChange,
  booleanMode = false,
}: {
  question: AssessmentQuestion;
  value: string | string[] | null;
  multi: boolean;
  onChange: (value: AssessmentAnswerValue) => void;
  booleanMode?: boolean;
}): React.ReactElement {
  const options =
    booleanMode && (question.options == null || question.options.length === 0)
      ? [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ]
      : (question.options ?? []);

  const toggleMulti = useCallback(
    (optionId: string) => {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      onChange(next);
    },
    [onChange, value],
  );

  return (
    <View style={styles.questionBlock} testID={`assessment-question-${question.id}`}>
      <QuestionLabel question={question} />
      <View style={styles.optionCard}>
        {options.map((option, index) => {
          const selected = multi
            ? Array.isArray(value) && value.includes(option.id)
            : value === option.id;
          return (
            <Pressable
              key={option.id}
              testID={`assessment-option-${question.id}-${option.id}`}
              onPress={() => {
                if (multi) toggleMulti(option.id);
                else onChange(option.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={({ pressed }) => [
                styles.optionRow,
                index > 0 && styles.optionDivider,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.description ? (
                  <Text style={styles.optionDesc}>{option.description}</Text>
                ) : null}
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={SYSTEM_ACCENT} />
              ) : (
                <View style={styles.optionCircle} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NumberInput({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: AssessmentAnswerValue | undefined;
  onChange: (value: AssessmentAnswerValue) => void;
}): React.ReactElement {
  const textValue =
    typeof value === "number" && Number.isFinite(value) ? String(value) : "";

  return (
    <View style={styles.questionBlock} testID={`assessment-question-${question.id}`}>
      <QuestionLabel question={question} />
      <View style={styles.inputCard}>
        <TextInput
          value={textValue}
          onChangeText={(text) => {
            const trimmed = text.trim();
            if (trimmed.length === 0) {
              onChange(null);
              return;
            }
            const parsed = Number(trimmed);
            if (!Number.isFinite(parsed)) return;
            let clamped = parsed;
            if (question.min != null) clamped = Math.max(clamped, question.min);
            if (question.max != null) clamped = Math.min(clamped, question.max);
            onChange(clamped);
          }}
          keyboardType="decimal-pad"
          placeholder={question.placeholder ?? "Enter a number"}
          placeholderTextColor={UI_TEXT_TERTIARY_LABEL}
          style={styles.textInput}
          accessibilityLabel={question.prompt}
          testID={`assessment-input-${question.id}`}
        />
        {question.unit ? <Text style={styles.unit}>{question.unit}</Text> : null}
      </View>
    </View>
  );
}

function TextInputField({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: AssessmentAnswerValue | undefined;
  onChange: (value: AssessmentAnswerValue) => void;
}): React.ReactElement {
  const textValue = typeof value === "string" ? value : "";

  return (
    <View style={styles.questionBlock} testID={`assessment-question-${question.id}`}>
      <QuestionLabel question={question} />
      <View style={styles.inputCard}>
        <TextInput
          value={textValue}
          onChangeText={(text) => onChange(text.length > 0 ? text : null)}
          placeholder={question.placeholder ?? "Your answer"}
          placeholderTextColor={UI_TEXT_TERTIARY_LABEL}
          style={[styles.textInput, styles.textInputMultiline]}
          multiline={question.inputType === "text"}
          accessibilityLabel={question.prompt}
          testID={`assessment-input-${question.id}`}
        />
      </View>
    </View>
  );
}

function QuestionLabel({ question }: { question: AssessmentQuestion }): React.ReactElement {
  return (
    <View style={styles.labelWrap}>
      <Text style={styles.prompt}>
        {question.prompt}
        {question.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {question.helperText ? <Text style={styles.helper}>{question.helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  questionBlock: {
    gap: 10,
    marginBottom: 20,
  },
  labelWrap: {
    gap: 4,
  },
  prompt: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    lineHeight: 22,
  },
  required: {
    color: SYSTEM_ACCENT,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  optionCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    overflow: "hidden",
  },
  optionRow: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_SURFACE_PRESSED,
  },
  optionPressed: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  optionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: UI_TEXT_TERTIARY_LABEL,
  },
  inputCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
    padding: 0,
  },
  textInputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  unit: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
    fontWeight: "600",
  },
  unsupported: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
  },
});
