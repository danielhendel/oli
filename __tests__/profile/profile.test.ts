/**
 * Tests the local Profile persistence layer.
 * Verifies defaults, save→load, and runtime validation guard.
 */
import {
    loadProfile,
    saveProfile,
    clearProfile,
    makeDefaultProfile,
    makeMockProfile,
    type Profile,
  } from "../../lib/profile/profile";
  
  // Mock AsyncStorage using Jest's requireActual (no direct require())
  jest.mock("@react-native-async-storage/async-storage", () =>
    jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
  );
  
  import AsyncStorage from "@react-native-async-storage/async-storage";
  
  describe("profile persistence", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await clearProfile();
    });
  
    test("makeDefaultProfile returns sensible defaults", () => {
      const p = makeDefaultProfile("u1");
      expect(p.id).toBe("u1");
      expect(p.unitSystem).toBe("metric");
      expect(p.displayName).toBeUndefined();
    });
  
    test("saveProfile then loadProfile round-trips", async () => {
      const input: Profile = makeMockProfile("u2");
      await saveProfile(input);
  
      const loaded = await loadProfile();
      expect(loaded).toEqual(input);
  
      // ensure correct key usage under the hood
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  
    test("loadProfile returns null when storage empty", async () => {
      const loaded = await loadProfile();
      expect(loaded).toBeNull();
    });
  
    test("runtime validation guards: invalid stored shape returns null", async () => {
      // simulate corrupt object (missing id)
      const corrupt = JSON.stringify({ unitSystem: "metric", displayName: "No ID" });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(corrupt);
  
      const loaded = await loadProfile();
      expect(loaded).toBeNull();
    });
  });
  