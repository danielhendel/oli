import React from 'react';
import { View, Text } from 'react-native';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Route not found</Text>
    </View>
  );
}
