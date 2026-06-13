// app/(app)/program/builder.tsx
// Oli — Program Builder hub. Opened from the Program tab "+" button. Route composition only:
// build the builder cards via the pure selector and render the hub. No persistence, no IO.
import React, { useCallback } from "react";
import { type Href, useRouter } from "expo-router";

import { buildProgramHomeModel } from "@/lib/data/program/buildProgramHomeModel";
import type { ProgramBuilderType } from "@/lib/data/program/types";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramBuilderHubScreen } from "@/lib/ui/program/ProgramBuilderHubScreen";

export default function ProgramBuilderHubRoute() {
  useBuilderStackHeader("Program Builder");
  const router = useRouter();
  const model = buildProgramHomeModel();

  const onOpenBuilder = useCallback(
    (type: ProgramBuilderType) => {
      const card = model.builders.find((b) => b.type === type);
      if (card?.href) router.push(card.href as Href);
    },
    [model.builders, router],
  );

  return <ProgramBuilderHubScreen builders={model.builders} onOpenBuilder={onOpenBuilder} />;
}
