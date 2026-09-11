// app/(onboarding)/connect.tsx
import React from "react";

import { useConnectSources } from "@/lib/onboarding/useConnectSources";
import { ConnectSourcesScreenContent } from "@/lib/ui/onboarding/ConnectSourcesScreenContent";

export default function ConnectSourcesRoute() {
  const connect = useConnectSources();

  return (
    <ConnectSourcesScreenContent
      apple={connect.apple}
      oura={connect.oura}
      advancing={connect.advancing}
      bannerError={connect.bannerError}
      onConnectApple={() => {
        void connect.connectAppleHealth();
      }}
      onConnectOura={() => {
        void connect.connectOura();
      }}
      onContinue={() => {
        void connect.continueNext();
      }}
      onLater={() => {
        void connect.skipForLater();
      }}
    />
  );
}
