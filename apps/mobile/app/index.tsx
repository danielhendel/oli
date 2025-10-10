// apps/mobile/app/index.tsx
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/Themed';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <ThemedText testID="signed-in" type="title" accessibilityRole="header">
        {user ? `You are signed in as ${user.email ?? 'unknown'}` : 'Welcome'}
      </ThemedText>

      <Link href="/settings" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Go to Settings" style={styles.button}>
          <ThemedText type="body" style={styles.buttonText}>
            Go to Settings
          </ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  button: {
    marginTop: 16,
    height: 44,
    minWidth: 180,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
