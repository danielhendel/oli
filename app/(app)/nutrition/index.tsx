import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";

type NutritionSection = {
  title: string;
  href: string;
  subtitle?: string;
  disabled?: boolean;
};

const SECTIONS: NutritionSection[] = [
  { title: "Overview", href: "/(app)/nutrition/overview", subtitle: "Calories & macros" },
  { title: "Log Nutrition", href: "/(app)/nutrition/log", subtitle: "Meals & foods" },
  { title: "Targets", href: "/(app)/nutrition/targets", subtitle: "Macro & calorie goals" },
];

export default function NutritionEntryScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Nutrition" subtitle="Macros & micros">
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
