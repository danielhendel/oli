// app/(onboarding)/about-you.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAboutYouForm } from "@/lib/onboarding/useAboutYouForm";
import { AboutYouScreenContent } from "@/lib/ui/onboarding/AboutYouScreenContent";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

export default function AboutYouRoute() {
  const form = useAboutYouForm();

  if (!form.loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: UI_APP_SCREEN_BG, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <AboutYouScreenContent
      draft={form.draft}
      errors={form.errors}
      submitting={form.submitting}
      bannerError={form.bannerError}
      onChange={form.updateDraft}
      onSubmit={() => {
        void form.submit();
      }}
    />
  );
}
