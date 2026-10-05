/** BCV-029 — Joint correlated measurement-error propagation (§23.13). Model A + Model B. */
import { makeNoiseProtocol } from "../noiseProtocol";

export const bcv029 = makeNoiseProtocol({
  protocolId: "BCV-029",
  title: "Joint correlated measurement error propagation",
});
