import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';
import { FormTextInput } from '@/components/FormTextInput';
import { useAuth } from '@/providers/AuthProvider';
import { getGeneralProfile, upsertGeneralProfile, UserGeneralProfile } from '@/lib/db/users';

export default function GeneralProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [initial, setInitial] = useState<UserGeneralProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // Load on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) return;
      try {
        const prof = await getGeneralProfile(uid);
        if (!mounted) return;
        setInitial(prof);
        setFirstName(prof.firstName);
        setLastName(prof.lastName);
        setDisplayName(prof.displayName);
        setEmail(prof.email);
      } catch {
        Alert.alert('Profile', 'Failed to load profile.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  const dirty = useMemo(() => {
    if (!initial) return false;
    return (
      firstName !== initial.firstName ||
      lastName !== initial.lastName ||
      displayName !== initial.displayName ||
      email !== initial.email
    );
  }, [initial, firstName, lastName, displayName, email]);

  const canSave = useMemo(() => {
    const nameOk =
      displayName.trim().length > 0 ||
      (firstName.trim().length > 0 && lastName.trim().length > 0);
    return !!uid && nameOk && !busy && !!initial && dirty;
  }, [uid, displayName, firstName, lastName, busy, initial, dirty]);

  const onSave = useCallback(async () => {
    if (!uid || !canSave) return;
    try {
      setBusy(true);
      Keyboard.dismiss();
      await upsertGeneralProfile(uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
      });
      // Treat current values as the new baseline
      const next: UserGeneralProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        avatarUrl: initial?.avatarUrl ?? '',
        createdAt: initial?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      setInitial(next);
      Alert.alert('Profile', 'Saved!');
      router.back();
    } catch {
      Alert.alert('Profile', 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  }, [uid, canSave, firstName, lastName, displayName, email, initial, router]);

  if (!uid) {
    return (
      <ScreenContainer>
        <Centered>
          <ThemedText>You must be signed in to edit your profile.</ThemedText>
        </Centered>
      </ScreenContainer>
    );
  }

  if (!initial) {
    return (
      <ScreenContainer>
        <Centered>
          <ActivityIndicator />
        </Centered>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ThemedView style={styles.card}>
        <ThemedText type="title" accessibilityRole="header">
          General Profile
        </ThemedText>

        <FormTextInput
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          returnKeyType="next"
          autoCapitalize="words"
          accessibilityLabel="First name"
          testID="firstNameInput"
        />
        <FormTextInput
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          returnKeyType="next"
          autoCapitalize="words"
          accessibilityLabel="Last name"
          testID="lastNameInput"
        />
        <FormTextInput
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          returnKeyType="next"
          autoCapitalize="words"
          accessibilityLabel="Display name"
          testID="displayNameInput"
        />
        <FormTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel="Email"
          testID="emailInput"
        />

        <View style={styles.actions}>
          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
            disabled={!canSave}
            style={({ pressed }) => [
              styles.button,
              !canSave && styles.buttonDisabled,
              pressed && canSave && styles.buttonPressed,
            ]}
            testID="saveProfileButton"
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="body" style={styles.buttonText}>
                Save
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ThemedView>
    </ScreenContainer>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 16 },
  button: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
