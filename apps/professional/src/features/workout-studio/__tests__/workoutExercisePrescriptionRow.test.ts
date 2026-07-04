import fs from "node:fs";
import path from "node:path";

import { defaultExerciseBuilderPrescription } from "../exerciseBuilderPrescription";

describe("WorkoutExercisePrescriptionRow", () => {
  const componentPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutExercisePrescriptionRow.tsx",
  );
  const cssPath = path.join(
    __dirname,
    "../../../components/workout-studio/WorkoutExercisePrescriptionRow.module.css",
  );

  it("renders visual card with builder thumbnail, notes, and detail links", () => {
    const content = fs.readFileSync(componentPath, "utf8");
    expect(content).toMatch(/visualCard/);
    expect(content).toMatch(/size="builder"/);
    expect(content).toMatch(/getExerciseOptionalDetailLinks/);
    expect(content).toMatch(/detailLink/);
    expect(content).toMatch(/exerciseNotesField/);
    expect(content).toMatch(/exercise notes/);
    expect(content).not.toMatch(/badgeCanonical/);
    expect(content).toMatch(/data-exercise-id/);
    expect(content).not.toMatch(/Use general for all sets/);
    expect(content).not.toMatch(/className=\{styles\.customizeLink\}/);
    expect(content).not.toMatch(/className=\{styles\.notesField\}/);
  });

  it("renders exercise-level control bar and two-row per-set layout without tempo input", () => {
    const content = fs.readFileSync(componentPath, "utf8");
    expect(defaultExerciseBuilderPrescription().customizeEachSet).toBe(true);
    expect(content).toMatch(/exerciseControlBar/);
    expect(content).toMatch(/ExerciseLevelControlBar/);
    expect(content).toMatch(/applyExerciseLevelSetCount/);
    expect(content).toMatch(/applyExerciseLevelRepsToAllSets/);
    expect(content).toMatch(/applyExerciseLevelRestToAllSets/);
    expect(content).toMatch(/customSetCard/);
    expect(content).toMatch(/customSetPrimaryRow/);
    expect(content).toMatch(/customSetSecondaryRow/);
    expect(content).toMatch(/repsGroup/);
    expect(content).toMatch(/loadGroup/);
    expect(content).toMatch(/intensityGroup/);
    expect(content).toMatch(/restGroup/);
    expect(content).toMatch(/INTENSITY_TARGET_KINDS/);
    expect(content).toMatch(/intensity type/);
    expect(content).toMatch(/intensity value/);
    expect(content).toMatch(/rest unit/);
    expect(content).toMatch(/Delete \$\{exerciseLabel\} set/);
    expect(content).not.toMatch(/set \$\{set\.setNumber\} tempo/);
    expect(content).not.toMatch(/tempoInput/);
    expect(content).not.toMatch(/onPatch\(\{ tempo:/);
  });

  it("groups unit dropdowns with value inputs and aligns rest under load", () => {
    const content = fs.readFileSync(componentPath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(content).toMatch(/loadGroup[\s\S]*load value[\s\S]*load unit/);
    expect(content).toMatch(/restGroup[\s\S]*rest value[\s\S]*rest unit/);
    expect(content).toMatch(/intensityGroup[\s\S]*intensity type[\s\S]*intensity value/);
    expect(css).toMatch(/\.customSetPrimaryRow/);
    expect(css).toMatch(/\.customSetSecondaryRow/);
    expect(css).toMatch(/\.loadGroup/);
    expect(css).toMatch(/\.intensityGroup/);
    expect(css).toMatch(/\.restGroup/);
    expect(css).toMatch(/grid-template-columns:\s*52px minmax\(230px, 1fr\) minmax\(280px, 1fr\) 36px/);
    expect(css).toMatch(/\.customSetSecondaryRow > \.restGroup/);
    expect(css).toMatch(/\.loadUnitSelect[\s\S]*width:\s*68px/);
    expect(css).toMatch(/\.restUnitSelect[\s\S]*width:\s*68px/);
    expect(css).not.toMatch(/\.tempoInput/);
  });

  it("includes accessible aria-labels for per-set controls", () => {
    const content = fs.readFileSync(componentPath, "utf8");

    expect(content).toMatch(/reps type/);
    expect(content).toMatch(/reps value/);
    expect(content).toMatch(/side/);
    expect(content).toMatch(/load type/);
    expect(content).toMatch(/load value/);
    expect(content).toMatch(/load unit/);
    expect(content).toMatch(/intensity type/);
    expect(content).toMatch(/intensity value/);
    expect(content).not.toMatch(/set \$\{set\.setNumber\} tempo/);
    expect(content).toMatch(/rest value/);
    expect(content).toMatch(/rest unit/);
    expect(content).toMatch(/Delete \$\{exerciseLabel\} set/);
  });
});
