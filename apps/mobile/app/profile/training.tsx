// apps/mobile/app/profile/training.tsx
import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useUserProfile } from '@/hooks/useUserProfile';
import SaveBar from '@/components/profile/SaveBar';

export default function TrainingProfile() {
  const { profile, save, loading } = useUserProfile();
  const [saving, setSaving] = useState(false);
  if (loading) return <Text>Loading…</Text>;
  if (!profile) return <Text>Sign in required</Text>;

  const mornings = (profile as any).trainingMornings ?? false;

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ color:'white', marginBottom:8 }}>Prefer Morning Training</Text>
      <Switch
        value={mornings}
        onValueChange={async (v) => { setSaving(true); await save({ trainingMornings: v } as any); setSaving(false); }}
      />
      <SaveBar saving={saving} />
    </View>
  );
}
