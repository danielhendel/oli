// apps/mobile/app/(app)/profile/general.tsx
import React, { useCallback } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useUserGeneralProfile } from '@/hooks/useUserGeneralProfile';
import SaveBar from '@/components/profile/SaveBar';

export default function ProfileGeneralScreen() {
  const { profile, loading, saving, error, save } = useUserGeneralProfile();

  const onChange = useCallback((k: 'firstName'|'lastName'|'displayName', v: string) => {
    // Debounce/throttle etc. can be added later; for now, save on blur explicitly
    (save as any)({ [k]: v });
  }, [save]);

  if (loading) return null;

  return (
    <View style={{ flex:1, padding:20, gap:10 }}>
      <Text style={{ fontSize:20, fontWeight:'600' }}>General</Text>
      <TextInput
        placeholder="First name"
        defaultValue={profile?.firstName ?? ''}
        onEndEditing={(e) => onChange('firstName', e.nativeEvent.text)}
        style={{ borderWidth:1, borderColor:'#e6e6e6', padding:12, borderRadius:10 }}
      />
      <TextInput
        placeholder="Last name"
        defaultValue={profile?.lastName ?? ''}
        onEndEditing={(e) => onChange('lastName', e.nativeEvent.text)}
        style={{ borderWidth:1, borderColor:'#e6e6e6', padding:12, borderRadius:10 }}
      />
      <TextInput
        placeholder="Display name"
        defaultValue={profile?.displayName ?? ''}
        onEndEditing={(e) => onChange('displayName', e.nativeEvent.text)}
        style={{ borderWidth:1, borderColor:'#e6e6e6', padding:12, borderRadius:10 }}
      />
      <SaveBar saving={saving} error={error} />
    </View>
  );
}
