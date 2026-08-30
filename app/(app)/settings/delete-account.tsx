import { DeleteAccountScreenContent } from "@/lib/ui/settings/DeleteAccountScreenContent";
import { useAccountDeletion } from "@/lib/data/user-data/accountDeletion/useAccountDeletion";

export default function DeleteAccountRoute() {
  const deletion = useAccountDeletion();
  return <DeleteAccountScreenContent deletion={deletion} />;
}
