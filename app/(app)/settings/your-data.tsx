import { YourDataScreen } from "@/lib/ui/settings/YourDataScreen";
import { useUserDataInventory } from "@/lib/data/user-data/useUserDataInventory";

export default function YourDataRoute() {
  const { state, inventory, error, refresh } = useUserDataInventory();
  return (
    <YourDataScreen state={state} inventory={inventory} error={error} onRefresh={refresh} />
  );
}
