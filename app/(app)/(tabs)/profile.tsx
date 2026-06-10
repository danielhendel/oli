// app/(app)/(tabs)/profile.tsx
// Digital Twin home (Manage → Profile). Thin: composes profile identity + Digital Twin VM.
import React from "react";

import { ProfileMainScreen } from "@/lib/ui/profile/ProfileMainScreen";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { buildProfileTabViewModel } from "@/lib/data/profile/profileTabViewModel";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useDigitalTwinHome } from "@/lib/features/profile/digitalTwin/useDigitalTwinHome";

export default function ProfileTabScreen() {
  const { state } = useUserProfileMain();
  const { state: prefState } = usePreferences();
  const { vm: twin } = useDigitalTwinHome();

  const vm = buildProfileTabViewModel(state);

  return (
    <ProfileMainScreen
      profile={vm.profile}
      status={vm.displayStatus}
      hydrating={vm.hydrating}
      isSaving={vm.isSaving}
      {...(vm.errorMessage !== undefined ? { errorMessage: vm.errorMessage } : {})}
      massUnit={prefState.preferences.units.mass}
      twin={twin}
    />
  );
}
