// apps/mobile/components/profile/SaveBar.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

type Props = {
  saving?: boolean;
  error?: string | null;
};

export default function SaveBar({ saving, error }: Props) {
  const role = saving ? 'progressbar' : 'text';

  return (
    <View
      accessibilityRole={role}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        backgroundColor: '#111',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {saving ? <ActivityIndicator /> : null}
      <Text style={{ color: '#fff', fontWeight: '600' }}>
        {saving ? 'Saving…' : error ? 'Save error' : 'All changes saved'}
      </Text>
      {error ? (
        <Text style={{ color: '#ff6b6b', marginLeft: 8 }} numberOfLines={1}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
