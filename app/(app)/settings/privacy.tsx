import { PrivacyScreenContent } from "@/lib/ui/settings/PrivacyScreenContent";
import { useUserDataInventory } from "@/lib/data/user-data/useUserDataInventory";

export default function PrivacyScreen() {
  const { inventory } = useUserDataInventory();
  return <PrivacyScreenContent inventory={inventory} />;
}
