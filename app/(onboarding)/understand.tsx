// app/(onboarding)/understand.tsx
import React from "react";

import { useUnderstandReadiness } from "@/lib/onboarding/useUnderstandReadiness";
import { UnderstandScreenContent } from "@/lib/ui/onboarding/UnderstandScreenContent";

export default function UnderstandRoute() {
  const readiness = useUnderstandReadiness();

  return (
    <UnderstandScreenContent
      viewModel={readiness.viewModel}
      completing={readiness.completing}
      bannerError={readiness.bannerError}
      onComplete={() => {
        void readiness.complete();
      }}
    />
  );
}
