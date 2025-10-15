// apps/mobile/app/profile/general.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useUserProfile } from '@/hooks/useUserProfile';
import SaveBar from '@/components/profile/SaveBar';

/**
 * Maps to ProfileGeneral from /types/profiles.ts
 * Fields: sex?, dateOfBirth?, heightCm?, weightKg? (and any identity mirrors)
 */
export default function GeneralProfile() {
  const { profile, setProfile, save, loading, error } = useUserProfile();
  const [saving, setSaving] = useState(false);

  const draft = useMemo(() => profile ?? ({} as any), [profile]);

  async function commit<K extends keyof any>(k: K, v: any) {
    setSaving(true);
    await save({ [k]: v } as any);
    setSaving(false);
  }

  if (loading) return <Text>Loading…</Text>;
  if (!profile) return <Text>Sign in required</Text>;

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ color:'white', marginBottom:8 }}>Name</Text>
      <TextInput
        accessibilityLabel="Name"
        value={(draft as any).name ?? ''}
        onChangeText={(t) => setProfile(p => p ? { ...(p as any), name: t } as any : p)}
        onEndEditing={e => commit('name', e.nativeEvent.text)}
        style={{ color:'white', borderWidth:1, borderColor:'#333', padding:12, borderRadius:10, marginBottom:12 }}
      />

      <Text style={{ color:'white', marginBottom:8 }}>Date of Birth (YYYY-MM-DD)</Text>
      <TextInput
        accessibilityLabel="Date of Birth"
        value={(draft as any).dateOfBirth ?? ''}
        onChangeText={(t) => setProfile(p => p ? { ...(p as any), dateOfBirth: t } as any : p)}
        onEndEditing={e => commit('dateOfBirth', e.nativeEvent.text)}
        style={{ color:'white', borderWidth:1, borderColor:'#333', padding:12, borderRadius:10, marginBottom:12 }}
      />

      <Text style={{ color:'white', marginBottom:8 }}>Sex</Text>
      <TextInput
        accessibilityLabel="Sex"
        placeholder="male | female | other | prefer_not_to_say"
        value={(draft as any).sex ?? ''}
        onChangeText={(t) => setProfile(p => p ? { ...(p as any), sex: t as any } as any : p)}
        onEndEditing={e => commit('sex', e.nativeEvent.text)}
        style={{ color:'white', borderWidth:1, borderColor:'#333', padding:12, borderRadius:10, marginBottom:12 }}
      />

      <Text style={{ color:'white', marginBottom:8 }}>Height (cm)</Text>
      <TextInput
        accessibilityLabel="Height in centimeters"
        keyboardType="numeric"
        value={String((draft as any).heightCm ?? '')}
        onChangeText={(t) => setProfile(p => p ? { ...(p as any), heightCm: Number(t) || undefined } as any : p)}
        onEndEditing={(e) => commit('heightCm', Number(e.nativeEvent.text) || undefined)}
        style={{ color:'white', borderWidth:1, borderColor:'#333', padding:12, borderRadius:10, marginBottom:12 }}
      />

      <Text style={{ color:'white', marginBottom:8 }}>Weight (kg)</Text>
      <TextInput
        accessibilityLabel="Weight in kilograms"
        keyboardType="numeric"
        value={String((draft as any).weightKg ?? '')}
        onChangeText={(t) => setProfile(p => p ? { ...(p as any), weightKg: Number(t) || undefined } as any : p)}
        onEndEditing={(e) => commit('weightKg', Number(e.nativeEvent.text) || undefined)}
        style={{ color:'white', borderWidth:1, borderColor:'#333', padding:12, borderRadius:10 }}
      />

      <SaveBar saving={saving} error={error} />
    </View>
  );
}
