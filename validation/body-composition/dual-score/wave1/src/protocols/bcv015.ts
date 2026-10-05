/**
 * BCV-015 — Missingness + Resolver status simulation (§23.13, §23.17.4).
 * Baselines P-01 (male) and P-11 (female): 81 families × 2 personas = 162 instance rows
 * (160 executable + 2 `H1_MISSING_SEX` not_applicable rows that are listed but never executed).
 */
import { runBcv015 } from "../fixtures015";
import { BCV015_MATRIX } from "../fixtures015Matrix";
import { provenance } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export function bcv015Run(): RunOutput {
  const { rows, summary } = runBcv015();
  const byEngine: Record<string, number> = {};
  for (const r of rows) byEngine[r.engine] = (byEngine[r.engine] ?? 0) + 1;
  const failing = rows.filter((r) => r.executable && r.structuralPass === false);
  return {
    protocolId: "BCV-015",
    experimentId: "BCV-015",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: {
      protocolId: "BCV-015",
      summary,
      byEngine,
      families: BCV015_MATRIX.map((f) => ({ fixtureId: f.fixtureId, executable: f.executable })),
      rows,
    },
    summaryMd: [
      "# BCV-015 — Missingness + Resolver status simulation",
      "",
      `Families: ${summary.familyCount} (${summary.executableFamilyCount} executable, ${summary.notApplicableFamilyCount} not_applicable).`,
      `Instance rows: ${summary.instanceRows}; executed: ${summary.executedInstances}; not_applicable listed: ${summary.notApplicableInstances}.`,
      `Structural pass: ${summary.structuralPass}; fail: ${summary.structuralFail}.`,
      `Resolver-status patched instances: ${summary.statusPatchedInstances} (recorded per row in resolverStatusPatched / resolverStatusPatchReason).`,
      `Baseline-normalized instances: ${summary.baselineNormalizedInstances}.`,
      failing.length > 0 ? `Failing: ${failing.map((r) => r.fixtureInstanceId).join(", ")}` : "No failing instances.",
      "",
      "Expected reasons are taken from the Mathematical Truth Freeze only; no new policy.",
    ].join("\n"),
    manifest: {
      inputDomains: { baselines: ["P-01", "P-11"], familyCount: summary.familyCount },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        matrix: provenance("validation_plan", "§23.17.4.8", { families: summary.familyCount }),
      },
      notes:
        "Fixture status patching for resolver states the Resolver cannot emit naturally is recorded per row; see summary.",
      epsilon: true,
    },
  };
}

export const bcv015: ProtocolDefinition = {
  protocolId: "BCV-015",
  experimentId: "BCV-015",
  streamCode: 15,
  title: "Missingness + Resolver status simulation",
  interpretationClass: "structural_invariant",
  emitsCsv: false,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv015Run();
  },
};
