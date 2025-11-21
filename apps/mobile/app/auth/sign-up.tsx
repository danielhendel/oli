// apps/mobile/app/auth/sign-up.tsx
import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FormTextInput } from '@/components/FormTextInput';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';
import { signUpEmailPassword } from '@/lib/auth/actions';
import { mapFirebaseError } from '@/lib/auth/errorMap';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  async function onSubmit() {
    if (!canSubmit || busy) return;
    try {
      setBusy(true);
      Keyboard.dismiss();
      await signUpEmailPassword(email.trim(), password);
      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('Sign Up Error', mapFirebaseError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <ThemedView style={styles.card}>
        <ThemedText type="title" accessibilityRole="header">
          Create Account
        </ThemedText>

        <FormTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          accessibilityLabel="Email"
          returnKeyType="next"
        />

        <FormTextInput
          label="Password (min 6 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
          accessibilityLabel="Password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        <View style={styles.actions}>
          <Pressable
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            disabled={!canSubmit || busy}
            style={({ pressed }) => [
              styles.button,
              (!canSubmit || busy) && styles.buttonDisabled,
              pressed && !busy && styles.buttonPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="body" style={styles.buttonText}>
                Create Account
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ThemedText style={styles.footer}>
          Already have an account? <Link href="/auth/sign-in">Sign in</Link>
        </ThemedText>
      </ThemedView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  actions: { marginTop: 16 },
  button: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 12 },
});
