// apps/mobile/app/settings.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';
import { useAuth } from '@/providers/AuthProvider';
import { signOutUser } from '@/lib/auth/actions';

/**
 * User account settings.
 *
 * Single source of truth for all account settings UI.
 * Route: /settings
 */
export default function Settings() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initializing && !user) {
      // Guard: if someone somehow hits /settings while signed out
      router.replace('/auth/sign-in');
    }
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

  const email = user?.email ?? 'unknown';

  return (
    <ScreenContainer>
      <ThemedView style={styles.card}>
        <ThemedText type="title" accessibilityRole="header">
          Settings
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="body" style={styles.sectionLabel}>
            Account
          </ThemedText>
          <ThemedText style={styles.detail}>
            Signed in as{' '}
            <ThemedText type="body" style={styles.emphasis}>
              {email}
            </ThemedText>
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="body" style={styles.sectionLabel}>
            Actions
          </ThemedText>

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
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  detail: {
    marginTop: 4,
  },
  emphasis: {
    fontWeight: '600',
  },
  button: {
    marginTop: 12,
    height: 44,
    minWidth: 160,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
