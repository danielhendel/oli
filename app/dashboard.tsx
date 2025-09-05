import { useEffect } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth/AuthContext";

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      // Not signed in? Send to Home (where we put a Sign In button)
      router.replace("/");
    }
  }, [user, router]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.subtitle}>Redirecting…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Protected content visible because you’re signed in.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 36, fontWeight: "700" },
  subtitle: { marginTop: 8, fontSize: 16, opacity: 0.7 },
});