import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";

type TrainingSection = {
  title: string;
  href: string;
  subtitle?: string;
  disabled?: boolean;
};

const SECTIONS: TrainingSection[] = [
  { title: "Overview", href: "/(app)/workouts/overview", subtitle: "Workload & performance" },
  { title: "Log Workout", href: "/(app)/workouts/log", subtitle: "Manual workout entry" },
  { title: "History", href: "/(app)/workouts/history", subtitle: "Past sessions & trends" },
];

export default function WorkoutsEntryScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Training" subtitle="Strength & cardio">
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
