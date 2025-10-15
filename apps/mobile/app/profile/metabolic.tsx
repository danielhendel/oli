// apps/mobile/app/profile/metabolic.tsx
import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useUserProfile } from '@/hooks/useUserProfile';
import SaveBar from '@/components/profile/SaveBar';

export default function MetabolicProfile() {
  const { profile, save, loading } = useUserProfile();
  const [saving, setSaving] = useState(false);

  // Initialize state BEFORE any early returns
  const [bf, setBf] = useState(
    String(((profile as any)?.bodyFatPctEstimate) ?? '')
  );

  if (loading) return <Text>Loading…</Text>;
  if (!profile) return <Text>Sign in required</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: 'white' }}>Body Fat % (estimate)</Text>
      <TextInput
        keyboardType="numeric"
        value={bf}
        onChangeText={setBf}
        onEndEditing={async () => {
          setSaving(true);
          await save({ bodyFatPctEstimate: Number(bf) || undefined } as any);
          setSaving(false);
        }}
        style={{
          color: 'white',
          borderWidth: 1,
          borderColor: '#333',
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />
      <SaveBar saving={saving} />
    </View>
  );
}
