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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormTextInput } from '@/components/FormTextInput';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { signInEmailPassword } from '@/lib/auth/actions';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    } catch (err) {
      console.error('[auth] email/password sign-in error:', err);
      Alert.alert('Sign In Error', 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, canSubmit, email, password, router]);

  // Balanced top/bottom padding around the centered content
  const padV = 24;
  const containerStyle = {
    paddingTop: insets.top + padV,
    paddingBottom: insets.bottom + padV,
  } as const;

  return (
    <ScreenContainer>
      <View style={[styles.centerWrap, containerStyle]}>
        {/* Brand OUTSIDE the card in its own wrapper to avoid clipping */}
        <View style={styles.brandWrap}>
          <ThemedText type="title" style={styles.brandOutside} accessibilityRole="header">
            Oli
          </ThemedText>
        </View>

        <ThemedView style={styles.card}>
          <ThemedText type="title" accessibilityRole="header" style={styles.screenTitle}>
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
          <View accessible accessibilityLabel="Social sign-in options" style={{ gap: 10 }}>
            <AppleSignInButton
              disabled={!!ssoBusy || busy}
              onStart={() => setSsoBusy('apple')}
              onFinish={() => setSsoBusy(null)}
              testID="appleButton"
            />

            <View style={{ opacity: busy || ssoBusy ? 0.6 : 1 }}>
              <GoogleSignInButton />
            </View>
          </View>

          <ThemedText style={styles.footer}>
            New here? <Link href="/auth/sign-up">Create an account</Link>
          </ThemedText>
        </ThemedView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', // brand + card centered as a column
    paddingHorizontal: 16,
    gap: 8, // space between brand and card
  },

  // NEW: wrapper prevents any parent overflow from clipping the brand
  brandWrap: {
    paddingTop: 8,
    overflow: 'visible',
  },

  // Brand outside the card so the rounded border can’t clip it
  brandOutside: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 36, // 👈 roomy line-height so the "O" never gets shaved
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },

  screenTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },

  actions: { marginTop: 8 },

  divider: { height: 1, backgroundColor: '#00000020', marginVertical: 16 },

  // Match Apple button footprint
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },

  footer: { marginTop: 12, textAlign: 'center' },
});
