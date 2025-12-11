// apps/mobile/app/(app)/index.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeDashboard() {
  const r = useRouter();

  function handleOpenSettings(source: 'header' | 'debug') {
    // This MUST fire if the press is working.
    Alert.alert('Tap detected', `Settings pressed from: ${source}`);
    r.push('/settings'); // we’ll use the existing /settings screen
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right']}
    >
      {/* Simple sticky header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => r.push('/(app)/profile')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={styles.headerIconTouchable}
        >
          <Ionicons name="person-circle-outline" size={26} color="#111" />
        </Pressable>

        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
          accessible
        >
          Oli
        </Text>

        <Pressable
          onPress={() => handleOpenSettings('header')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={styles.headerIconTouchable}
        >
          <Ionicons name="settings-outline" size={22} color="#111" />
        </Pressable>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome to Oli. Choose where to go:
        </Text>

        <Pressable
          onPress={() => r.push('/(app)/profile')}
          style={styles.primaryButton}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.primaryButtonText}>Profile</Text>
        </Pressable>

        <Pressable
          onPress={() => r.push('/(app)/profile/general')}
          style={styles.primaryButton}
          accessibilityRole="button"
          accessibilityLabel="Edit general profile"
        >
          <Text style={styles.primaryButtonText}>Edit General Profile</Text>
        </Pressable>

        <Pressable
          disabled
          style={styles.disabledButton}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Workouts coming soon"
        >
          <Text style={styles.disabledButtonText}>Workouts (coming soon)</Text>
        </Pressable>

        <Pressable
          disabled
          style={styles.disabledButton}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Nutrition coming soon"
        >
          <Text style={styles.disabledButtonText}>Nutrition (coming soon)</Text>
        </Pressable>

        {/* Big debug button – should act exactly like the header gear */}
        <Pressable
          onPress={() => handleOpenSettings('debug')}
          style={[styles.primaryButton, { marginTop: 32 }]}
          accessibilityRole="button"
          accessibilityLabel="Debug: Open settings"
        >
          <Text style={styles.primaryButtonText}>Debug: Open Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginTop: 8, // nudge below status bar
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3e3e3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerIconTouchable: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#efefef',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  disabledButtonText: {
    fontSize: 16,
    color: '#777',
  },
});
