"use client";

import { useCallback, useRef, useState, type RefObject } from "react";

import type { BuilderNavSection } from "@/features/workout-studio/workoutStudioNavigation";

type SectionRefs = {
  overviewRef: RefObject<HTMLDivElement | null>;
  volumeRef: RefObject<HTMLDivElement | null>;
  qualityRef: RefObject<HTMLDivElement | null>;
  blocksRef: RefObject<HTMLDivElement | null>;
  toolsRef: RefObject<HTMLDivElement | null>;
};

export function useWorkoutStudioNavigation(
  libraryColumnRef: RefObject<HTMLElement | null>,
): {
  activeSection: BuilderNavSection;
  sectionRefs: SectionRefs;
  scrollToSection: (section: BuilderNavSection) => void;
} {
  const [activeSection, setActiveSection] = useState<BuilderNavSection>("blocks");
  const overviewRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback(
    (section: BuilderNavSection) => {
      setActiveSection(section);

      if (section === "library") {
        libraryColumnRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const target =
        section === "overview"
          ? overviewRef.current
          : section === "projectedVolume"
            ? volumeRef.current
            : section === "blocks"
              ? blocksRef.current
              : section === "quality"
                ? qualityRef.current
                : section === "tools"
                  ? toolsRef.current
                  : null;

      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [libraryColumnRef],
  );

  return {
    activeSection,
    sectionRefs: {
      overviewRef,
      volumeRef,
      qualityRef,
      blocksRef,
      toolsRef,
    },
    scrollToSection,
  };
}
