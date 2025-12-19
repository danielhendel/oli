import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";

type BodySection = {
  title: string;
  href: string;
  subtitle?: string;
  disabled?: boolean;
};

const SECTIONS: BodySection[] = [
  { title: "Overview", href: "/(app)/body/overview", subtitle: "Composition summary" },
  { title: "Weight", href: "/(app)/body/weight", subtitle: "Daily weigh-ins & trends" },
  { title: "DEXA", href: "/(app)/body/dexa", subtitle: "Body composition scans", disabled: true },
];

export default function BodyEntryScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Body" subtitle="Weight, DEXA, composition">
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
