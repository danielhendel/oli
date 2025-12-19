import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";

type RecoverySection = {
  title: string;
  href: string;
  subtitle?: string;
  disabled?: boolean;
};

const SECTIONS: RecoverySection[] = [
  { title: "Overview", href: "/(app)/recovery/overview", subtitle: "Sleep & readiness" },
  { title: "Sleep", href: "/(app)/recovery/sleep", subtitle: "Duration & quality", disabled: true },
  { title: "Readiness", href: "/(app)/recovery/readiness", subtitle: "Daily recovery status", disabled: true },
];

export default function RecoveryEntryScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Recovery" subtitle="Sleep & readiness">
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
