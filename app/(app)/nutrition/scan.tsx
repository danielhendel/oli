import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BarcodeScanningResult } from "expo-camera";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useNutritionBarcodeLookup } from "@/lib/hooks/useNutritionBarcodeLookup";
import { type DayKey } from "@/lib/ui/calendar/types";
import { resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";

type ScanResultState = "notFound" | "error";

function classifyLookupError(error: string): ScanResultState {
  return /no food matched/i.test(error) ? "notFound" : "error";
}

export default function NutritionBarcodeScanScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { lookup } = useNutritionBarcodeLookup();
  const params = useLocalSearchParams<{ day?: string | string[]; returnTo?: string | string[] }>();
  const dayKey: DayKey = useMemo(() => resolveNutritionDayParam(params.day), [params.day]);

  const returnToParam = useMemo(() => {
    const r =
      typeof params.returnTo === "string"
        ? params.returnTo
        : Array.isArray(params.returnTo)
          ? params.returnTo[0]
          : "";
    return r === "library" ? "library" : "";
  }, [params.returnTo]);

  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resultState, setResultState] = useState<ScanResultState | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const lastScanAt = useRef(0);
  const lastCode = useRef("");

  const goSearch = useCallback(() => {
    router.push({ pathname: "/(app)/nutrition/search", params: { day: dayKey } });
  }, [router, dayKey]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Scan barcode",
    });
  }, [navigation]);

  const goFood = useCallback(
    (foodId: string) => {
      router.replace({
        pathname: "/(app)/nutrition/food/[foodId]",
        params: {
          foodId,
          day: dayKey,
          source: "barcode",
          ...(returnToParam === "library" ? { returnTo: "library" } : {}),
        },
      });
    },
    [router, dayKey, returnToParam],
  );

  const resolveBarcode = useCallback(
    async (raw: string, scan?: Pick<BarcodeScanningResult, "cornerPoints">) => {
      const code = raw.trim();
      if (!code) {
        setMessage("Enter a barcode or scan again.");
        setResultState("notFound");
        return;
      }
      lastCode.current = code;
      setBusy(true);
      setMessage(null);
      setResultState(null);
      setScanFeedback(null);
      const res = await lookup(code);
      setBusy(false);
      if (!res.ok) {
        setMessage(res.error);
        setResultState(classifyLookupError(res.error));
        return;
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* simulator / unsupported */
      }
      const open = () => {
        goFood(res.data.id);
        setScanFeedback(null);
      };
      const pts = scan?.cornerPoints;
      if (scan != null) {
        if (pts != null && pts.length >= 4) {
          setScanFeedback("Strong scan");
        } else if (pts != null && pts.length > 0) {
          setScanFeedback("Hold steadier for a stronger read");
        } else {
          setScanFeedback("Matched — opening food");
        }
        setTimeout(open, 220);
      } else {
        void open();
      }
    },
    [lookup, goFood],
  );

  const onScanned = useCallback(
    (ev: BarcodeScanningResult | { nativeEvent: BarcodeScanningResult }) => {
      if (busy) return;
      const payload =
        ev != null && typeof ev === "object" && "nativeEvent" in ev && ev.nativeEvent != null
          ? ev.nativeEvent
          : (ev as BarcodeScanningResult);
      if (typeof payload.data !== "string" || payload.data.length === 0) return;
      const now = Date.now();
      if (now - lastScanAt.current < 2000) return;
      lastScanAt.current = now;
      void resolveBarcode(payload.data, payload);
    },
    [resolveBarcode, busy],
  );

  const denied = permission && !permission.granted && !permission.canAskAgain;
  const needsAsk = permission && !permission.granted && permission.canAskAgain;

  return (
    <ModuleScreenShell title="Scan barcode" subtitle={`Day ${dayKey}`} hideTitleChrome>
      <View style={[styles.flex, { paddingBottom: insets.bottom + 16 }]}>
        {permission == null ? (
          <View style={styles.center}>
            <ActivityIndicator color={SYSTEM_ACCENT} />
          </View>
        ) : null}

        {needsAsk ? (
          <View style={styles.pad}>
            <Text style={styles.body}>
              Camera access lets Oli read the barcode on packaged foods so we can match it to nutrition data.
            </Text>
            <Pressable
              onPress={() => void requestPermission()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Allow camera access for barcode scanning"
            >
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {denied ? (
          <View style={styles.pad} accessibilityRole="text">
            <Text style={styles.body}>
              Camera access is off. You can still type the barcode digits below — Oli only uses them to look up
              nutrition in your catalog.
            </Text>
          </View>
        ) : null}

        {permission?.granted ? (
          <View style={styles.cameraBox}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
              }}
              onBarcodeScanned={onScanned}
            />
          </View>
        ) : null}

        <View style={styles.pad}>
          <Text style={styles.label}>Manual barcode</Text>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            keyboardType="number-pad"
            placeholder="Digits under the bars"
            placeholderTextColor="#8E8E93"
            style={styles.input}
            accessibilityLabel="Manual barcode entry"
          />
          <Pressable
            onPress={() => void resolveBarcode(manualCode, undefined)}
            disabled={busy}
            style={({ pressed }) => [styles.secondary, (pressed || busy) && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Look up barcode"
          >
            <Text style={styles.secondaryText}>{busy ? "Looking up…" : "Look up"}</Text>
          </Pressable>
          {message != null && resultState != null ? (
            <View
              style={[styles.resultBox, resultState === "error" ? styles.resultError : styles.resultInfo]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text style={styles.resultTitle}>
                {resultState === "error" ? "Connection problem" : "No match found"}
              </Text>
              <Text style={styles.resultBody}>
                {resultState === "error"
                  ? "We couldn't reach the food database. Check your connection and try again."
                  : message}
              </Text>
              <View style={styles.resultActions}>
                {resultState === "error" && lastCode.current.length > 0 ? (
                  <Pressable
                    onPress={() => void resolveBarcode(lastCode.current, undefined)}
                    disabled={busy}
                    style={({ pressed }) => [styles.resultBtn, (pressed || busy) && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Retry barcode lookup"
                  >
                    <Text style={styles.resultBtnText}>Try again</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={goSearch}
                  style={({ pressed }) => [styles.resultBtnGhost, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Search for this food by name instead"
                >
                  <Text style={styles.resultBtnGhostText}>Search by name</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {scanFeedback ? (
            <Text style={styles.feedbackOk} accessibilityLiveRegion="polite">
              {scanFeedback}
            </Text>
          ) : null}
          <Text style={styles.attribution} accessibilityRole="text">
            Packaged foods are matched via Open Food Facts. Data © Open Food Facts contributors.
          </Text>
        </View>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pad: { paddingHorizontal: 16, gap: 12, paddingTop: 12 },
  body: { fontSize: 16, lineHeight: 22, color: "#1C1C1E" },
  cameraBox: { height: 260, marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  camera: { flex: 1 },
  label: { fontSize: 15, fontWeight: "600", color: "#636366" },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.29)",
    paddingHorizontal: 12,
    fontSize: 17,
    backgroundColor: UI_CARD_SURFACE,
  },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  secondary: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: SYSTEM_ACCENT, fontSize: 17, fontWeight: "700" },
  feedbackOk: { fontSize: 15, color: "#2E7D32", lineHeight: 20 },
  attribution: { fontSize: 12, color: "#8E8E93", lineHeight: 18, marginTop: 4 },
  resultBox: { borderRadius: 12, padding: 14, gap: 8 },
  resultInfo: { backgroundColor: "rgba(60, 60, 67, 0.08)" },
  resultError: { backgroundColor: "rgba(255, 59, 48, 0.08)" },
  resultTitle: { fontSize: 16, fontWeight: "700", color: "#1C1C1E" },
  resultBody: { fontSize: 15, color: "#1C1C1E", lineHeight: 21 },
  resultActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  resultBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  resultBtnGhost: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnGhostText: { color: SYSTEM_ACCENT, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});
