// lib/modules/commandCenterLabs.ts
import type { UploadsPresence } from "@/lib/data/useUploadsPresence";

import type { Readiness } from "../contracts/readiness";

export type ReadinessVocabularyState = Readiness;

export type LabsCommandCenterModel = {
  state: ReadinessVocabularyState;
  title: string;
  description: string;
  latestSummary: string | null;
  showUploadCta: boolean;
  showViewCta: boolean;
  showFailuresCta: boolean;
};

function formatLatestObservedAt(observedAt: string): string {
  const ms = Date.parse(observedAt);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildLabsCommandCenterModel(args: {
  dataReadinessState: ReadinessVocabularyState;
  uploads: UploadsPresence | null;
  hasFailures: boolean;
}): LabsCommandCenterModel {
  const { dataReadinessState, uploads, hasFailures } = args;

  if (dataReadinessState === "partial") {
    return {
      state: "partial",
      title: "Labs",
      description:
        "Your derived truth is still building (partial). Lab upload presence will be available when the pipeline catches up.",
      latestSummary: null,
      showUploadCta: false,
      showViewCta: false,
      showFailuresCta: false,
    };
  }

  if (dataReadinessState === "error") {
    return {
      state: "error",
      title: "Labs",
      description:
        "Your derived truth is currently invalid (pipeline error). Fix upstream issues or review failures to understand why labs cannot be shown.",
      latestSummary: null,
      showUploadCta: false,
      showViewCta: false,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "missing") {
    return {
      state: "missing",
      title: "Labs",
      description: "No events yet today — lab uploads will appear here once you add data.",
      latestSummary: null,
      showUploadCta: true,
      showViewCta: false,
      showFailuresCta: hasFailures,
    };
  }

  // dataReadinessState === "ready"
  if (uploads === null) {
    return {
      state: "partial",
      title: "Labs",
      description:
        "Could not load lab uploads presence. This may be a temporary error. Try refreshing or check failures if the issue persists.",
      latestSummary: null,
      showUploadCta: true,
      showViewCta: false,
      showFailuresCta: hasFailures,
    };
  }

  if (uploads.count === 0) {
    return {
      state: "ready",
      title: "Labs",
      description: "No lab uploads yet",
      latestSummary: null,
      showUploadCta: true,
      showViewCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const latest = uploads.latest;
  const parts: string[] = [];
  if (latest?.originalFilename) parts.push(latest.originalFilename);
  if (latest?.observedAt) parts.push(`uploaded ${formatLatestObservedAt(latest.observedAt)}`);
  const latestSummary = parts.length ? parts.join(" • ") : `${uploads.count} lab upload(s)`;

  return {
    state: "ready",
    title: "Labs",
    description: latestSummary,
    latestSummary,
    showUploadCta: false,
    showViewCta: true,
    showFailuresCta: hasFailures,
  };
}
