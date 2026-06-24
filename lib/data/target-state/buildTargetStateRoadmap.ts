// lib/data/target-state/buildTargetStateRoadmap.ts
import { classifyHealthBaseline } from "@/lib/data/target-state/classifyBaseline";
import { getTargetStateDomainTitle } from "@/lib/data/target-state/domainLabels";
import { deriveMilestonesForMetric } from "@/lib/data/target-state/deriveMilestonesForMetric";
import {
  classificationLabelForLevel,
  deriveNextLevel,
} from "@/lib/data/target-state/deriveNextLevel";
import { deriveTargetPriority, getDomainPriorityOrder } from "@/lib/data/target-state/deriveTargetPriority";
import { formatLevelRange, getBandForLevel } from "@/lib/data/target-state/formatLevelRange";
import type {
  TargetMetricDataStatus,
  TargetStateConfidence,
  TargetStateDomain,
  TargetStateMetric,
  TargetStateRoadmap,
  TargetStateRoadmapInput,
} from "@/lib/data/target-state/types";
import type { ClassificationResult } from "@/lib/classifications/types";
import { CLASSIFICATION_FRAMEWORK_VERSION } from "@/lib/classifications/types";
import { getClassificationMetric } from "@/lib/classifications/registry";

function computeTargetStateConfidence(
  coveragePercent: number,
  classifiedCount: number,
): TargetStateConfidence {
  if (coveragePercent >= 60 && classifiedCount >= 5) return "high";
  if (coveragePercent >= 35 || classifiedCount >= 3) return "moderate";
  return "low";
}

function buildMetricFromClassification(
  result: ClassificationResult,
  priority: ReturnType<typeof deriveTargetPriority>,
): TargetStateMetric {
  const definition = getClassificationMetric(result.metricId);

  if (result.status === "unavailable") {
    const domain = result.domain ?? "body-composition";
    return {
      metricId: result.metricId,
      domain,
      label: definition?.displayName ?? result.metricId,
      currentValue: null,
      currentLevel: null,
      currentClassification: null,
      nextLevel: null,
      nextClassification: null,
      nextLevelRange: null,
      optimalLevelRange: null,
      milestoneTargets: deriveMilestonesForMetric({
        definition: definition ?? {
          metricId: result.metricId,
          displayName: result.metricId,
          domain,
          version: result.version,
          unit: "",
          evidenceSources: [],
          levels: [],
        },
        dataStatus: "unavailable",
        currentLevel: null,
        nextLevel: null,
        nextClassification: null,
        optimalClassification: classificationLabelForLevel(5),
      }),
      dataStatus: "unavailable",
      classificationVersion: result.version,
      priority,
    };
  }

  const currentLevel = result.level;
  const nextLevel = deriveNextLevel(currentLevel);
  const dataStatus: TargetMetricDataStatus =
    nextLevel == null ? "maintain-optimal" : "available";

  const nextClassification =
    nextLevel != null ? classificationLabelForLevel(nextLevel) : null;

  const optimalBand =
    definition != null ? getBandForLevel(definition.levels, 5) : undefined;
  const nextBand =
    definition != null && nextLevel != null
      ? getBandForLevel(definition.levels, nextLevel)
      : undefined;

  const unit = definition?.unit ?? "";

  return {
    metricId: result.metricId,
    domain: result.domain,
    label: result.displayName,
    currentValue: result.value,
    currentLevel,
    currentClassification: result.levelLabel,
    nextLevel,
    nextClassification,
    nextLevelRange: nextBand != null ? formatLevelRange(nextBand, unit) : null,
    optimalLevelRange:
      optimalBand != null ? formatLevelRange(optimalBand, unit) : null,
    milestoneTargets: deriveMilestonesForMetric({
      definition: definition ?? {
        metricId: result.metricId,
        displayName: result.displayName,
        domain: result.domain,
        version: result.version,
        unit,
        evidenceSources: [],
        levels: [],
      },
      dataStatus,
      currentLevel,
      nextLevel,
      nextClassification,
      optimalClassification: classificationLabelForLevel(5),
    }),
    dataStatus,
    classificationVersion: result.version,
    priority,
  };
}

export function buildTargetStateRoadmap(input: TargetStateRoadmapInput): TargetStateRoadmap {
  const primaryGoal = input.currentStateProfile?.primaryGoal ?? null;
  const domainPriorityOrder = getDomainPriorityOrder(primaryGoal);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sex = input.sex ?? null;

  if (input.baseline == null) {
    return {
      generatedAt,
      classificationVersion: CLASSIFICATION_FRAMEWORK_VERSION,
      primaryGoal,
      domainPriorityOrder,
      domains: [],
      dataCoveragePercent: 0,
      targetStateConfidence: "low",
    };
  }

  const domainResults = classifyHealthBaseline(input.baseline, sex);
  const metricsByDomain = new Map<string, TargetStateMetric[]>();

  let classifiedCount = 0;
  let totalCount = 0;

  for (const domainResult of domainResults) {
    const priority = deriveTargetPriority(primaryGoal, domainResult.domain);
    for (const result of domainResult.metrics) {
      totalCount += 1;
      if (result.status === "classified") classifiedCount += 1;
      const metric = buildMetricFromClassification(result, priority);
      const list = metricsByDomain.get(domainResult.domain) ?? [];
      list.push(metric);
      metricsByDomain.set(domainResult.domain, list);
    }
  }

  const dataCoveragePercent =
    totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0;

  const domains: TargetStateDomain[] = domainPriorityOrder
    .filter((domain) => metricsByDomain.has(domain))
    .map((domain) => ({
      domain,
      title: getTargetStateDomainTitle(domain),
      priority: deriveTargetPriority(primaryGoal, domain),
      metrics: metricsByDomain.get(domain) ?? [],
    }));

  return {
    generatedAt,
    classificationVersion: CLASSIFICATION_FRAMEWORK_VERSION,
    primaryGoal,
    domainPriorityOrder,
    domains,
    dataCoveragePercent,
    targetStateConfidence: computeTargetStateConfidence(dataCoveragePercent, classifiedCount),
  };
}
