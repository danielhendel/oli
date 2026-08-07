/**
 * Graph rebuilds from history input only — delete/reprocess have no graph store.
 */

import { buildLabTrendSeries } from "../buildLabTrendSeries";
import { makeNumericHistoryPoint as numericPoint } from "../__fixtures__/labTrendTestFixtures";

describe("lab trend delete / reprocess regressions", () => {
  const fourPointHistory = [
    numericPoint({
      id: "2024",
      collectedAt: "2024-10-15T00:00:00.000Z",
      sourceDocumentId: "doc-2024",
      value: 179,
    }),
    numericPoint({
      id: "2022",
      collectedAt: "2022-07-07T00:00:00.000Z",
      sourceDocumentId: "doc-2022",
      value: 208,
    }),
    numericPoint({
      id: "2020b",
      collectedAt: "2020-09-24T00:00:00.000Z",
      sourceDocumentId: "doc-2020b",
      value: 186,
    }),
    numericPoint({
      id: "2020a",
      collectedAt: "2020-06-05T00:00:00.000Z",
      sourceDocumentId: "doc-2020a",
      value: 173,
    }),
  ];

  it("delete removes the point and recalculates latest/prior", () => {
    const before = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: fourPointHistory,
    });
    expect(before.points).toHaveLength(4);
    expect(before.latest?.value).toBe(179);
    expect(before.prior?.value).toBe(208);

    // Simulate deleting the 2024 report (history API no longer returns it).
    const afterDelete = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: fourPointHistory.filter((p) => p.id !== "2024"),
    });
    expect(afterDelete.points).toHaveLength(3);
    expect(afterDelete.points.some((p) => p.acceptedResultId === "2024")).toBe(false);
    expect(afterDelete.latest?.value).toBe(208);
    expect(afterDelete.prior?.value).toBe(186);
    expect(afterDelete.change?.latestResultId).toBe("2022");
  });

  it("reprocess does not duplicate points when same accepted id returns once", () => {
    const reprocessed = [
      ...fourPointHistory,
      // Accidental client-side duplicate of same accepted representation.
      numericPoint({
        id: "2024",
        acceptedResultId: "2024",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "doc-2024",
        value: 179,
      }),
    ];
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: reprocessed,
    });
    expect(series.points).toHaveLength(4);
    expect(series.points.filter((p) => p.collectedDate === "2024-10-15")).toHaveLength(1);
    expect(series.latest?.collectedDate).toBe("2024-10-15");
  });

  it("collection date remains the axis after reprocess identity change of upload metadata", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: fourPointHistory.map((p, idx) => ({
        ...p,
        // Upload-order ids shuffled — must not affect graph order.
        id: `upload-${4 - idx}`,
      })),
    });
    expect(series.points.map((p) => p.collectedDate)).toEqual([
      "2020-06-05",
      "2020-09-24",
      "2022-07-07",
      "2024-10-15",
    ]);
  });
});
