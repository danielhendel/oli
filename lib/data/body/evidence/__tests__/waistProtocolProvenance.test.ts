/**
 * Waist protocol provenance — never invent WHO from method/provider alone.
 */
import { describe, expect, it } from "@jest/globals";

import {
  adaptContinuousBodyEvidenceEvent,
  resolveWaistProtocolProvenance,
} from "../continuousEvidenceAdapter";

describe("resolveWaistProtocolProvenance", () => {
  it("preserves explicit WHO protocol with version 1", () => {
    expect(
      resolveWaistProtocolProvenance({
        protocolId: "who_midpoint_v1",
        protocolVersion: 1,
      }),
    ).toEqual({ protocolId: "who_midpoint_v1", protocolVersion: 1 });
  });

  it("does not invent WHO when protocol is absent", () => {
    expect(resolveWaistProtocolProvenance({})).toEqual({
      protocolId: null,
      protocolVersion: null,
    });
    expect(
      resolveWaistProtocolProvenance({ protocolId: null, protocolVersion: null }),
    ).toEqual({ protocolId: null, protocolVersion: null });
  });

  it("preserves explicit unknown", () => {
    expect(
      resolveWaistProtocolProvenance({ protocolId: "unknown", protocolVersion: 1 }),
    ).toEqual({ protocolId: "unknown", protocolVersion: null });
  });

  it("fails closed when WHO id lacks compatible version", () => {
    expect(
      resolveWaistProtocolProvenance({ protocolId: "who_midpoint_v1" }),
    ).toEqual({ protocolId: null, protocolVersion: null });
    expect(
      resolveWaistProtocolProvenance({ protocolId: "who_midpoint_v1", protocolVersion: 2 }),
    ).toEqual({ protocolId: null, protocolVersion: null });
  });
});

describe("adaptContinuousBodyEvidenceEvent waist protocol", () => {
  it("does not label missing-protocol manual waist as WHO", () => {
    const r = adaptContinuousBodyEvidenceEvent({
      rawEventId: "evt_manual_no_protocol",
      kind: "body_composition",
      provider: "manual",
      sourceId: "manual",
      measuredAt: "2026-03-04T12:00:00.000Z",
      payload: { waistCircumferenceCm: 80 },
    });
    expect(r.observations).toHaveLength(1);
    const obs = r.observations[0]!;
    expect(obs.metricKey).toBe("waist_circumference");
    expect(obs.source.measurementMethod).toBe("manual_anthropometry");
    expect(obs.provenance.protocolId).toBeNull();
    expect(obs.provenance.protocolVersion).toBeNull();
  });

  it("preserves explicit WHO on Oli-created waist", () => {
    const r = adaptContinuousBodyEvidenceEvent({
      rawEventId: "evt_who",
      kind: "body_composition",
      provider: "manual",
      sourceId: "manual",
      measuredAt: "2026-03-04T12:00:00.000Z",
      payload: {
        waistCircumferenceCm: 80,
        protocolId: "who_midpoint_v1",
        protocolVersion: 1,
      },
    });
    expect(r.observations[0]?.provenance.protocolId).toBe("who_midpoint_v1");
    expect(r.observations[0]?.provenance.protocolVersion).toBe(1);
  });

  it("preserves explicit unknown protocol", () => {
    const r = adaptContinuousBodyEvidenceEvent({
      rawEventId: "evt_unknown",
      kind: "body_composition",
      provider: "manual",
      sourceId: "manual",
      measuredAt: "2026-03-04T12:00:00.000Z",
      payload: {
        waistCircumferenceCm: 80,
        protocolId: "unknown",
      },
    });
    expect(r.observations[0]?.provenance.protocolId).toBe("unknown");
    expect(r.observations[0]?.provenance.protocolVersion).toBeNull();
  });

  it("does not invent WHO for apple_health waist without protocol", () => {
    const r = adaptContinuousBodyEvidenceEvent({
      rawEventId: "evt_ah",
      kind: "body_composition",
      provider: "apple_health",
      sourceId: "apple_health",
      measuredAt: "2026-03-04T12:00:00.000Z",
      payload: { waistCircumferenceCm: 80 },
    });
    expect(r.observations[0]?.provenance.protocolId).toBeNull();
    expect(r.observations[0]?.provenance.protocolVersion).toBeNull();
  });
});
