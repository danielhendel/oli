import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { getWithingsConnectUrl } from "@/lib/api/withings";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DevicesScreen() {
  const presence = useWithingsPresence();
  const { getIdToken } = useAuth();

  const statusLine =
    presence.status === "error"
      ? "Error loading status"
      : presence.status === "ready"
        ? presence.data.connected
          ? "Status: Connected"
          : "Status: Not connected"
        : "Status: Loading…";

  const handleConnectWithings = async () => {
    const token = await getIdToken(false);
    if (!token) return;
    const res = await getWithingsConnectUrl(token);
    if (res.ok && res.json?.authorizationUrl) {
      await Linking.openURL(res.json.authorizationUrl);
    }
  };

  return (
    <ModuleScreenShell title="Devices" subtitle="Wearables & integrations">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Withings</Text>
        <Text style={styles.statusLine}>{statusLine}</Text>
        <Pressable style={styles.connectButton} onPress={handleConnectWithings}>
          <Text style={styles.connectButtonText}>Connect Withings</Text>
        </Pressable>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  statusLine: { fontSize: 15, color: "#3C3C43" },
  connectButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  connectButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
