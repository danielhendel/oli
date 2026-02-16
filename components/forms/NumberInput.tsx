// components/forms/NumberInput.tsx
import { useState, useEffect } from "react";
import { TextInput, StyleSheet, View } from "react-native";

type Props = {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
};

export default function NumberInput({ value, onChange, placeholder, min, max }: Props) {
  const [text, setText] = useState(value !== undefined ? String(value) : "");

  useEffect(() => {
    setText(value !== undefined ? String(value) : "");
  }, [value]);

  function commit(v: string) {
    const n = Number(v);
    if (Number.isNaN(n)) {
      onChange(undefined);
      return;
    }
    if (min !== undefined && n < min) { onChange(min); return; }
    if (max !== undefined && n > max) { onChange(max); return; }
    onChange(n);
  }

  return (
    <View style={styles.box}>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => commit(text)}
        placeholder={placeholder}
        inputMode="decimal"
        keyboardType="numeric"
        returnKeyType="done"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { fontSize: 16 },
});
