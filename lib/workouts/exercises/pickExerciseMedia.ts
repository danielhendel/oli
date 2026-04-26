/**
 * Native image/video picking for exercise media (no UI — call from screens/components).
 */
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type ExerciseMediaSlot = "image" | "video";

export async function readLocalUriAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function ensureExerciseMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  console.info("[exercise-media] request media library permission");
  const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
  console.info("[exercise-media] media library permission result", {
    status: r.status,
    canAskAgain: r.canAskAgain,
  });
  return r.status === "granted";
}

export async function ensureExerciseMediaCameraPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  console.info("[exercise-media] request camera permission");
  const r = await ImagePicker.requestCameraPermissionsAsync();
  console.info("[exercise-media] camera permission result", {
    status: r.status,
    canAskAgain: r.canAskAgain,
  });
  return r.status === "granted";
}

function guessMimeFromUri(uri: string, slot: ExerciseMediaSlot): string {
  const lower = uri.toLowerCase();
  if (slot === "video") {
    if (lower.endsWith(".mov")) return "video/quicktime";
    if (lower.endsWith(".m4v")) return "video/x-m4v";
    return "video/mp4";
  }
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function filenameFromUri(uri: string, slot: ExerciseMediaSlot): string {
  const tail = uri.split("/").pop()?.split("?")[0];
  if (tail != null && tail.length > 0 && tail.length < 200) return tail;
  return slot === "image" ? "image.jpg" : "video.mp4";
}

export async function pickExerciseMediaFromLibrary(
  slot: ExerciseMediaSlot,
): Promise<{ uri: string; mimeType: string; filename: string } | null> {
  if (Platform.OS === "web") return null;
  try {
    const ok = await ensureExerciseMediaLibraryPermission();
    if (!ok) return null;

    console.info("[exercise-media] launch library", { slot });
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: slot === "image" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: slot === "image",
      quality: slot === "image" ? 0.88 : 1,
      videoMaxDuration: 180,
    });
    if (result.canceled || result.assets[0] == null) {
      console.info("[exercise-media] library canceled", { slot });
      return null;
    }
    const a = result.assets[0];
    const mimeType = a.mimeType ?? guessMimeFromUri(a.uri, slot);
    const selected = { uri: a.uri, mimeType, filename: filenameFromUri(a.uri, slot) };
    console.info("[exercise-media] library selected asset", {
      slot,
      uri: selected.uri,
      mimeType: selected.mimeType,
      filename: selected.filename,
      fileSize: a.fileSize ?? null,
      width: a.width ?? null,
      height: a.height ?? null,
      duration: a.duration ?? null,
    });
    return selected;
  } catch (error: unknown) {
    console.error("[exercise-media] library picker failed", { slot, error });
    throw error;
  }
}

export async function captureExerciseMediaWithCamera(
  slot: ExerciseMediaSlot,
): Promise<{ uri: string; mimeType: string; filename: string } | null> {
  if (Platform.OS === "web") return null;
  try {
    const ok = await ensureExerciseMediaCameraPermission();
    if (!ok) return null;

    console.info("[exercise-media] launch camera", { slot });
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: slot === "image" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: slot === "image" ? 0.88 : 1,
      videoMaxDuration: 180,
    });
    if (result.canceled || result.assets[0] == null) {
      console.info("[exercise-media] camera canceled", { slot });
      return null;
    }
    const a = result.assets[0];
    const mimeType = a.mimeType ?? guessMimeFromUri(a.uri, slot);
    const selected = { uri: a.uri, mimeType, filename: filenameFromUri(a.uri, slot) };
    console.info("[exercise-media] camera selected asset", {
      slot,
      uri: selected.uri,
      mimeType: selected.mimeType,
      filename: selected.filename,
      fileSize: a.fileSize ?? null,
      width: a.width ?? null,
      height: a.height ?? null,
      duration: a.duration ?? null,
    });
    return selected;
  } catch (error: unknown) {
    console.error("[exercise-media] camera picker failed", { slot, error });
    throw error;
  }
}
