import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "appleHealth:anchor:v1";
const WORKOUTS_KEY = (uid: string) => `${PREFIX}:workouts:${uid}`;

function assertUid(uid: string): void {
  if (!uid || typeof uid !== "string") throw new Error("appleHealth anchor: uid required");
}

export async function getWorkoutsAnchor(uid: string): Promise<string | null> {
  assertUid(uid);
  return AsyncStorage.getItem(WORKOUTS_KEY(uid));
}

export async function setWorkoutsAnchor(uid: string, anchor: string): Promise<void> {
  assertUid(uid);
  if (!anchor || typeof anchor !== "string") throw new Error("appleHealth anchor: anchor required");
  await AsyncStorage.setItem(WORKOUTS_KEY(uid), anchor);
}

export async function clearWorkoutsAnchor(uid: string): Promise<void> {
  assertUid(uid);
  await AsyncStorage.removeItem(WORKOUTS_KEY(uid));
}
