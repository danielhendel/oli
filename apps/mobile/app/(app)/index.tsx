// apps/mobile/app/(app)/index.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const headerHeight = insets.top + 48; // status bar + 48px content area

  const handleProfilePress = () => {
    console.log('[Home] Profile icon pressed');
    router.push('/profile');
  };

  const handleSettingsPress = () => {
    console.log('[Home] Settings icon pressed');
    router.push('/settings');
  };

  const handleProfileButtonPress = () => {
    console.log('[Home] Profile button pressed');
    router.push('/profile');
  };

  const handleGeneralProfilePress = () => {
    console.log('[Home] Edit General Profile pressed');
    router.push('/profile/general');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      {/* App header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            height: headerHeight,
          },
        ]}
      >
        <Pressable
          onPress={handleProfilePress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={styles.headerIconTouchable}
        >
          <Ionicons name="person-circle-outline" size={26} color="#111" />
        </Pressable>

        <Text style={styles.headerTitle} accessibilityRole="header" accessible>
          Oli
        </Text>

        <Pressable
          onPress={handleSettingsPress}
          hitSlop={12}
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
          onPress={handleProfileButtonPress}
          style={styles.primaryButton}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.primaryButtonText}>Profile</Text>
        </Pressable>

        <Pressable
          onPress={handleGeneralProfilePress}
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

        {/* Debug button — uses the same handler as the gear */}
        <Pressable
          onPress={handleSettingsPress}
          style={[styles.primaryButton, { marginTop: 24 }]}
          accessibilityRole="button"
          accessibilityLabel="Debug: open settings"
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
