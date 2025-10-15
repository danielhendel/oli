// apps/mobile/components/profile/SaveBar.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

type Props = { saving: boolean; error?: string | null };

export default function SaveBar({ saving, error }: Props) {
  const label = saving ? 'Saving changes' : error ? 'Save error' : 'All changes saved';

  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#111' }}
      accessibilityLabel={label}
      accessibilityLiveRegion="polite" // Android: announce changes; ignored on iOS
    >
      {saving ? (
        <ActivityIndicator />
      ) : (
        <Text accessibilityRole="text">{error ? error : 'All changes saved'}</Text>
      )}
    </View>
  );
}
