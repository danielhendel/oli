import { YourDataScreen } from "@/lib/ui/settings/YourDataScreen";
import { useUserDataInventory } from "@/lib/data/user-data/useUserDataInventory";
import { useUserDataExport } from "@/lib/data/user-data/export/useUserDataExport";

export default function YourDataRoute() {
  const { state, inventory, error, refresh } = useUserDataInventory();
  const exportHook = useUserDataExport();
  return (
    <YourDataScreen
      state={state}
      inventory={inventory}
      error={error}
      onRefresh={refresh}
      exportHook={exportHook}
    />
  );
}
