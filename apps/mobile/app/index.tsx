// apps/mobile/app/index.tsx
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20 }}>👋 Home screen (root)</Text>
    </View>
  );
}
