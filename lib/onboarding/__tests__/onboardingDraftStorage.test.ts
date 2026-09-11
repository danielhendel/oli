import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearUserScopedLocalData } from "@/lib/auth/accountLifecycleCleanup";
import { ONBOARDING_DRAFT_KEY_PREFIX } from "../constants";
import {
  clearAboutYouDraft,
  emptyAboutYouDraft,
  loadAboutYouDraft,
  saveAboutYouDraft,
} from "../onboardingDraftStorage";

describe("onboarding draft account isolation", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("scopes drafts per uid", async () => {
    const a = { ...emptyAboutYouDraft(), preferredName: "A" };
    const b = { ...emptyAboutYouDraft(), preferredName: "B" };
    await saveAboutYouDraft("uid_a", a);
    await saveAboutYouDraft("uid_b", b);
    expect((await loadAboutYouDraft("uid_a")).preferredName).toBe("A");
    expect((await loadAboutYouDraft("uid_b")).preferredName).toBe("B");
    await clearAboutYouDraft("uid_a");
    expect((await loadAboutYouDraft("uid_a")).preferredName).toBe("");
    expect((await loadAboutYouDraft("uid_b")).preferredName).toBe("B");
  });

  it("clears draft on account_switch via lifecycle cleanup", async () => {
    await saveAboutYouDraft("uid_a", { ...emptyAboutYouDraft(), preferredName: "Keep?" });
    expect(await AsyncStorage.getItem(`${ONBOARDING_DRAFT_KEY_PREFIX}uid_a`)).toBeTruthy();
    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "account_switch" });
    expect(await AsyncStorage.getItem(`${ONBOARDING_DRAFT_KEY_PREFIX}uid_a`)).toBeNull();
  });
});
