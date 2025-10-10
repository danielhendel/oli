// apps/mobile/app/auth/sign-in.tsx
import React, { useCallback, useState } from 'react';
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
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { signInEmailPassword, signInWithGoogle } from '@/lib/auth/actions';
import { mapFirebaseAuthError } from '@/lib/errors/mapFirebaseAuthError';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [ssoBusy, setSsoBusy] = useState<'google' | 'apple' | null>(null);

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  const onSubmit = useCallback(async () => {
    if (busy || !canSubmit) return;
    try {
      setBusy(true);
      Keyboard.dismiss();
      await signInEmailPassword(email.trim(), password);
      router.replace('/');
    } catch (e) {
      Alert.alert('Sign In Error', mapFirebaseAuthError(e));
    } finally {
      setBusy(false);
    }
  }, [busy, canSubmit, email, password, router]);

  const onGoogle = useCallback(async () => {
    if (busy || ssoBusy) return;
    try {
      setSsoBusy('google');
      Keyboard.dismiss();
      await signInWithGoogle();
      router.replace('/');
    } catch (e) {
      Alert.alert('Google Sign In', mapFirebaseAuthError(e));
    } finally {
      setSsoBusy(null);
    }
  }, [busy, ssoBusy, router]);

  return (
    <ScreenContainer>
      <ThemedView style={styles.card}>
        <ThemedText type="title" accessibilityRole="header">
          Sign In
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
          testID="emailInput"
        />

        <FormTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          accessibilityLabel="Password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          testID="passwordInput"
        />

        <View style={styles.actions}>
          <Pressable
            testID="signInButton"
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            disabled={!canSubmit || busy || !!ssoBusy}
            style={({ pressed }) => [
              styles.button,
              (!canSubmit || busy || !!ssoBusy) && styles.buttonDisabled,
              pressed && !busy && !ssoBusy && styles.buttonPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="body" style={styles.buttonText}>
                Sign In
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Social sign-in */}
        <View accessible accessibilityLabel="Social sign-in options">
          <AppleSignInButton
            disabled={!!ssoBusy || busy}
            onStart={() => setSsoBusy('apple')}
            onFinish={() => setSsoBusy(null)}
            testID="appleButton"
          />

          <Pressable
            testID="googleButton"
            onPress={onGoogle}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            disabled={!!ssoBusy || busy}
            style={({ pressed }) => [
              styles.ssoButton,
              (!!ssoBusy || busy) && styles.buttonDisabled,
              pressed && !ssoBusy && !busy && styles.buttonPressed,
            ]}
          >
            {ssoBusy === 'google' ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="body" style={styles.buttonText}>
                G  Continue with Google
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ThemedText style={styles.footer}>
          New here? <Link href="/auth/sign-up">Create an account</Link>
        </ThemedText>
      </ThemedView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  actions: { marginTop: 16 },
  divider: { height: 1, backgroundColor: '#00000020', marginVertical: 16 },
  button: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  ssoButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 12 },
});
