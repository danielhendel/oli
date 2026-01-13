// services/functions/src/insights/prunePlan.ts

/**
 * Pure helper to decide which existing Insight document IDs must be deleted
 * to make the Insights set for a given (userId, day) authoritative.
 */
export function computeInsightPrunePlan(params: {
    existingIds: string[];
    keepIds: Set<string>;
  }): { toDelete: string[] } {
    const { existingIds, keepIds } = params;
  
    const toDelete = existingIds.filter((id) => !keepIds.has(id));
    return { toDelete };
  }
  