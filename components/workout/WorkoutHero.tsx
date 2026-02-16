// components/workout/WorkoutHero.tsx
import React from "react";
import Card from "../../lib/ui/Card";
import { Text } from "../../lib/ui/Text";

export type WorkoutHeroProps = {
  title: string;
  ymd: string;
  totalSets: number;
  totalVolumeKg?: number; // optional (no undefined passed)
};

export default function WorkoutHero({
  title,
  ymd,
  totalSets,
  totalVolumeKg,
}: WorkoutHeroProps) {
  return (
    <Card variant="elevated" radius="xl" padding="lg" style={{ gap: 6 }}>
      <Text size="xl" weight="bold">{title}</Text>
      <Text tone="muted">{ymd}</Text>
      <Text>
        {totalSets} set{totalSets === 1 ? "" : "s"}
        {typeof totalVolumeKg === "number" ? ` · ${Math.round(totalVolumeKg)} kg total` : ""}
      </Text>
    </Card>
  );
}
