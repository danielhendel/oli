// lib/ui/TextField.tsx
import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
} from "react-native";
import { Text } from "./Text";

type Props = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  secureTextEntry?: boolean;
  error?: string | null;
  /** Pass style overrides for the input container if needed */
  containerStyle?: object;
  /** Pass style overrides for the TextInput if needed */
  inputStyle?: object;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "keyboardType" | "returnKeyType" | "secureTextEntry">;

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  returnKeyType = "done",
  secureTextEntry = false,
  error = null,
  containerStyle,
  inputStyle,
  ...rest
}: Props) {
  return (
    <View style={containerStyle}>
      {label ? (
        <Text weight="medium" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={[styles.input, inputStyle]}
          placeholderTextColor="#9CA3AF"
          {...rest}
        />
      </View>

      {!!error && (
        <Text tone="danger" size="sm" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
  },
  error: {
    marginTop: 6,
  },
});
