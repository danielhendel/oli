import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';

export default function ProfileHub() {
  return (
    <ScreenContainer>
      <ThemedView style={styles.card}>
        <ThemedText type="title" accessibilityRole="header">
          Profile
        </ThemedText>

        <View style={styles.links}>
          <Link
            href="/profile/general"
            style={styles.linkTouchable}
            accessibilityRole="button"
            accessibilityLabel="Edit general profile"
          >
            <ThemedText type="body" style={styles.linkText}>
              General
            </ThemedText>
          </Link>

          {/* Stubs for upcoming sprints */}
          <Link
            href="/profile/training"
            style={styles.linkTouchable}
            accessibilityRole="button"
            accessibilityLabel="Training profile (coming soon)"
          >
            <ThemedText type="body" style={styles.linkText}>
              Training (coming soon)
            </ThemedText>
          </Link>

          <Link
            href="/profile/metabolic"
            style={styles.linkTouchable}
            accessibilityRole="button"
            accessibilityLabel="Metabolic profile (coming soon)"
          >
            <ThemedText type="body" style={styles.linkText}>
              Metabolic (coming soon)
            </ThemedText>
          </Link>
        </View>
      </ThemedView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  links: { marginTop: 12, gap: 12 },
  linkTouchable: { paddingVertical: 8 },
  linkText: { textDecorationLine: 'underline', fontWeight: '600' },
});
