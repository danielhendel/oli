import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";

type SettingsSection = {
  title: string;
  href: string;
  subtitle?: string;
  disabled?: boolean;
};

const SECTIONS: SettingsSection[] = [
  { title: "Account", href: "/(app)/settings/account", subtitle: "Profile & credentials" },
  { title: "Devices", href: "/(app)/settings/devices", subtitle: "Wearables & integrations", disabled: true },
  { title: "Privacy", href: "/(app)/settings/privacy", subtitle: "Data & permissions", disabled: true },
];

export default function SettingsEntryScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Settings" subtitle="App & data preferences">
      {SECTIONS.map((s) => {
        const disabled = Boolean(s.disabled);

        return (
          <ModuleSectionLinkRow
            key={s.href}
            title={s.title}
            disabled={disabled}
            onPress={() => {
              if (!disabled) router.push(s.href);
            }}
            {...(s.subtitle ? { subtitle: s.subtitle } : {})}
          />
        );
      })}
    </ModuleScreenShell>
  );
}
