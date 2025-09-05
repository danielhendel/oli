import { useState } from "react";
import { Link } from "expo-router";
import { SafeAreaView, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../lib/auth/AuthContext";
import { runFirestoreProbe, type ProbeResult } from "../lib/dev/firebaseProbe";

export default function HomeScreen() {
  const { user, signIn, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | null>(null);

  async function handleProbe() {
    setLoading(true);
    try {
      const res = await runFirestoreProbe();
      setProbe(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container} accessible accessibilityLabel="Oli Home Screen">
        <Text style={styles.title}>Oli</Text>
        <Text style={styles.subtitle}>Sprint 0 • Router online</Text>

        <View style={{ height: 16 }} />

        {user ? (
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.button}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={signIn} style={styles.button}>
            <Text style={styles.buttonText}>Sign In (Stub)</Text>
          </Pressable>
        )}

        <View style={{ height: 8 }} />

        <Link href="/dashboard" asChild>
          <Pressable accessibilityRole="button" style={[styles.button, styles.hollow]}>
            <Text style={styles.buttonText}>Go to Dashboard (Protected)</Text>
          </Pressable>
        </Link>

        <View style={{ height: 24 }} />

        <Text style={styles.sectionTitle}>Dev Console</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleProbe}
          style={[styles.button, styles.devBtn]}
          disabled={loading}
        >
          {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Run Firebase Probe</Text>}
        </Pressable>

        {probe && (
          <View style={styles.probeBox} accessibilityLabel="Firebase Probe Result">
            <Text style={styles.probeText}>
              {probe.status.toUpperCase()} [{probe.mode}]: {probe.message}
            </Text>
            {probe.status !== "success" && (
              <Text style={styles.probeHelp}>
                Tip: To use the Emulator Suite, set expo.extra.useEmulators: true in app.json and run
                <Text style={styles.code}> firebase emulators:start</Text>.
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 40, fontWeight: "700", letterSpacing: 0.5 },
  subtitle: { marginTop: 8, fontSize: 16, opacity: 0.7 },
  sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: "600" },
  button: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111"
  },
  hollow: { backgroundColor: "#fff", borderWidth: 1 },
  devBtn: { backgroundColor: "#0a0a0a" },
  buttonText: { fontSize: 16, fontWeight: "600" },
  probeBox: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, maxWidth: 340 },
  probeText: { fontSize: 14 },
  probeHelp: { marginTop: 6, fontSize: 12, opacity: 0.7 },
  code: { fontFamily: "Courier", fontSize: 12 }
});