// components/setup/StubScreen.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { useRouter, type Href } from "expo-router";

export default function StubScreen({
  title,
  nextHref,
}: {
  title: string;
  nextHref?: Href | string;
}) {
  const r = useRouter();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.wrap}>
        <Card variant="elevated" radius="lg" padding="md">
          <Text size="xl" weight="bold">{title}</Text>
          <Text tone="muted" style={{ marginTop: 8 }}>
            This is a placeholder. The full flow arrives in the next steps of Sprint 3.
          </Text>
          {nextHref ? (
            <Button
              label="Start"
              accessibilityLabel="Start setup"
              style={{ marginTop: 12, alignSelf: "flex-start" }}
              onPress={() => r.push(nextHref as Href)}
            />
          ) : null}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
});
