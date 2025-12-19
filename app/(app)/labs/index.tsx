import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";

type LabsSection = {
  title: string;
  href: string;
  subtitle?: string;
  disabled?: boolean;
};

const SECTIONS: LabsSection[] = [
  { title: "Overview", href: "/(app)/labs/overview", subtitle: "Biomarker summary" },
  { title: "Upload Labs", href: "/(app)/labs/upload", subtitle: "PDF & lab results", disabled: true },
  { title: "Biomarkers", href: "/(app)/labs/biomarkers", subtitle: "Individual markers", disabled: true },
];

export default function LabsEntryScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Labs" subtitle="Bloodwork & biomarkers">
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
