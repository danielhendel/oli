// app/(app)/(tabs)/profile.tsx
import React from "react";

import { ProfileMainScreen } from "@/lib/ui/profile/ProfileMainScreen";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { buildProfileTabViewModel } from "@/lib/data/profile/profileTabViewModel";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useProfileHealthSummary } from "@/lib/features/profile/useProfileHealthSummary";

export default function ProfileTabScreen() {
  const { state } = useUserProfileMain();
  const { state: prefState } = usePreferences();
  const health = useProfileHealthSummary();

  const vm = buildProfileTabViewModel(state);

  return (
    <ProfileMainScreen
      profile={vm.profile}
      status={vm.displayStatus}
      hydrating={vm.hydrating}
      isSaving={vm.isSaving}
      {...(vm.errorMessage !== undefined ? { errorMessage: vm.errorMessage } : {})}
      massUnit={prefState.preferences.units.mass}
      health={health}
    />
  );
}
