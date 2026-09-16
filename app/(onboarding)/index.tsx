// app/(onboarding)/index.tsx — Opening (signed-out); signed-in redirected by RouteGuard
import React from "react";
import { useRouter } from "expo-router";

import { OpeningScreenContent } from "@/lib/ui/onboarding/OpeningScreenContent";

export default function OnboardingOpeningRoute() {
  const router = useRouter();

  return (
    <OpeningScreenContent
      onGetStarted={() => router.push("/(auth)/sign-up")}
      onSignIn={() => router.push("/(auth)/sign-in")}
    />
  );
}
