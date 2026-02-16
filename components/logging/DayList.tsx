// components/logging/DayList.tsx
import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Text,
} from "react-native";
import Card from "../../lib/ui/Card";

// Keep a local, minimal UI type to avoid leaking internal types
type UIEvent = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
};

type Props = {
  loading: boolean;
  error: string | null;
  items?: UIEvent[] | null;
  onRefresh: () => Promise<void> | void;
};

export default function DayList({ loading, error, items, onRefresh }: Props) {
  const list: UIEvent[] = Array.isArray(items) ? items : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={!!loading} onRefresh={() => void onRefresh()} />
      }
    >
      {error ? (
        <Card variant="elevated" padding="md" radius="xl">
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {list.length === 0 && !loading ? (
        <Card variant="elevated" padding="lg" radius="xl">
          <Text style={styles.body}>No logs for this day.</Text>
        </Card>
      ) : (
        list.map((e) => (
          <Card key={e.id} variant="elevated" padding="md" radius="xl" style={styles.item}>
            <View style={{ gap: 4 }}>
              <Text style={styles.title}>{e.title}</Text>
              {e.subtitle ? <Text style={styles.body}>{e.subtitle}</Text> : null}
              <Text style={styles.caption}>{e.time}</Text>
            </View>
          </Card>
        ))
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  item: { marginTop: 2 },
  title: { fontSize: 18, fontWeight: "700" },
  body: { fontSize: 16 },
  caption: { fontSize: 12, opacity: 0.6 },
  error: { color: "#D64545", fontSize: 16, fontWeight: "600" },
});
