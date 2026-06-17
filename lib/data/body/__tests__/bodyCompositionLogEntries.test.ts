import {
  buildBodyCompositionLogEntries,
  buildBodyCompositionLogRowVm,
} from "@/lib/data/body/bodyCompositionLogEntries";
import type { RawEventListItem } from "@oli/contracts";

describe("bodyCompositionLogEntries", () => {
  const baseItem = (overrides: Partial<RawEventListItem> = {}): RawEventListItem => ({
    id: "w1",
    userId: "u1",
    sourceId: "manual",
    kind: "weight",
    observedAt: "2026-06-06T14:30:00.000Z",
    receivedAt: "2026-06-06T14:30:01.000Z",
    schemaVersion: 1,
    payload: {
      time: "2026-06-06T14:30:00.000Z",
      timezone: "America/New_York",
      weightKg: 72.8931,
    },
    ...overrides,
  });

  it("builds log rows with exact weight decimals via shared formatter", () => {
    const entries = buildBodyCompositionLogEntries([baseItem()], "America/New_York");
    expect(entries).toHaveLength(1);
    const row = buildBodyCompositionLogRowVm(entries[0]!, "lb");
    expect(row.dateLabel).toBe("June 6, 2026");
    expect(row.primaryMetric).toBe("Weight 160.7 lb");
  });

  it("marks manual entries editable and deletable", () => {
    const [entry] = buildBodyCompositionLogEntries([baseItem()], "America/New_York");
    expect(entry?.isImported).toBe(false);
    expect(entry?.canEdit).toBe(true);
    expect(entry?.canDelete).toBe(true);
    expect(entry?.deleteMenuLabel).toBe("Delete");
  });

  it("marks Apple Health entries as editable with Delete from Oli", () => {
    const [entry] = buildBodyCompositionLogEntries(
      [baseItem({ sourceId: "apple_health", id: "ah1" })],
      "America/New_York",
    );
    expect(entry?.isImported).toBe(true);
    expect(entry?.canEdit).toBe(true);
    expect(entry?.canDelete).toBe(true);
    expect(entry?.deleteMenuLabel).toBe("Delete from Oli");
    expect(entry?.editDisabledReason).toBeNull();
  });
});
