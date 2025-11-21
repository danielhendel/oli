// apps/mobile/app/settings.tsx
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Pressable, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';
import { useAuth } from '@/providers/AuthProvider';
import { signOutUser } from '@/lib/auth/actions';

export default function Settings() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initializing && !user) router.replace('/auth/sign-in');
  }, [initializing, user, router]);

  async function handleSignOut() {
    if (busy) return;
    try {
      setBusy(true);
      await signOutUser();
      router.replace('/auth/sign-in');
    } catch {
      Alert.alert('Sign Out Error', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <ThemedView style={styles.card}>
        <ThemedText type="title" accessibilityRole="header">
          Settings
        </ThemedText>

        <ThemedText style={styles.detail}>
          Signed in as <ThemedText type="body" style={styles.emphasis}>{user?.email ?? 'unknown'}</ThemedText>
        </ThemedText>

        <View style={styles.actions}>
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              busy && styles.buttonDisabled,
              pressed && !busy && styles.buttonPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="body" style={styles.buttonText}>
                Sign out
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ThemedView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  detail: { marginTop: 8 },
  emphasis: { fontWeight: '600' },
  actions: { marginTop: 16 },
  button: {
    height: 44,
    minWidth: 160,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
