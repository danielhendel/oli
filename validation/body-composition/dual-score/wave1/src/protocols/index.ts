/** Wave 1 protocol registry — exactly 16 members (§23.0). */
import { WAVE1_PROTOCOL_IDS } from "../constants";
import type { ProtocolId } from "../constants";
import type { ProtocolDefinition } from "../artifacts";

import { bcv001 } from "./bcv001";
import { bcv002 } from "./bcv002";
import { bcv006 } from "./bcv006";
import { bcv007 } from "./bcv007";
import { bcv012 } from "./bcv012";
import { bcv013 } from "./bcv013";
import { bcv014 } from "./bcv014";
import { bcv015 } from "./bcv015";
import { bcv016 } from "./bcv016";
import { bcv017 } from "./bcv017";
import { bcv018 } from "./bcv018";
import { bcv029 } from "./bcv029";
import { bcv030 } from "./bcv030";
import { bcv031 } from "./bcv031";
import { bcv032a } from "./bcv032a";
import { bcv034 } from "./bcv034";

export const PROTOCOLS: readonly ProtocolDefinition[] = [
  bcv001, bcv002, bcv006, bcv007, bcv012, bcv013, bcv014, bcv015, bcv016,
  bcv017, bcv018, bcv029, bcv030, bcv031, bcv032a, bcv034,
];

/**
 * Execution order. BCV-032A reads BCV-029/030 artifacts, so it runs after them.
 * (PROTOCOLS above is in membership order; this is the dependency-respecting order.)
 */
export const EXECUTION_ORDER: readonly ProtocolId[] = [
  "BCV-001", "BCV-006", "BCV-007", "BCV-012", "BCV-013", "BCV-014", "BCV-015", "BCV-016", "BCV-017",
  "BCV-018", "BCV-031", "BCV-034", "BCV-002", "BCV-029", "BCV-030", "BCV-032A",
];

export function protocolById(id: string): ProtocolDefinition {
  const p = PROTOCOLS.find((x) => x.protocolId === id);
  if (!p) throw new Error(`protocol_not_found:${id}`);
  return p;
}

export function assertRegistryComplete(): void {
  const ids = PROTOCOLS.map((p) => p.protocolId).sort();
  const expected = [...WAVE1_PROTOCOL_IDS].sort();
  if (JSON.stringify(ids) !== JSON.stringify(expected) || ids.length !== 16) {
    throw new Error(`protocol_registry_mismatch:${ids.join(",")}`);
  }
}
