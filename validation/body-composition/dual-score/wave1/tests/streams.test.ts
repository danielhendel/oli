import {
  CANONICAL_SEED,
  RHO_GRID,
  SIGMA_MULTIPLIERS,
  STREAM_CODES,
  WAVE1_PROTOCOL_IDS,
} from "../src/constants";
import {
  SCORE_BASE,
  derivedSeed,
  enumerateMainStreamSeeds,
  findSeedCollisions,
  mainStreamSeed,
  modelIndexOf,
  reversalSeed,
  reversalSubstream,
  rhoIndexOf,
  sigmaIndexOf,
} from "../src/streams";

describe("stream codes", () => {
  it("are the frozen table", () => {
    expect(STREAM_CODES).toEqual({
      "BCV-001": 1,
      "BCV-002": 2,
      "BCV-006": 6,
      "BCV-007": 7,
      "BCV-012": 12,
      "BCV-013": 13,
      "BCV-014": 14,
      "BCV-015": 15,
      "BCV-016": 16,
      "BCV-017": 17,
      "BCV-018": 18,
      "BCV-029": 29,
      "BCV-030": 30,
      "BCV-031": 31,
      "BCV-032A": 3201,
      "BCV-034": 34,
    });
    expect(new Set(Object.values(STREAM_CODES)).size).toBe(16);
  });
});

describe("derivedSeed (integer arithmetic)", () => {
  it("applies the exact formula", () => {
    const s = derivedSeed({
      streamCode: 30,
      personaIndex: 3,
      sigmaIndex: 2,
      rhoIndex: 4,
      modelIndex: 1,
      substreamIndex: 1,
    });
    expect(s).toBe(CANONICAL_SEED + 30 * 1_000_000 + 3 * 10_000 + 2 * 1_000 + 4 * 100 + 1 * 10 + 1);
    expect(Number.isInteger(s)).toBe(true);
  });

  it("defaults all omitted indices to 0", () => {
    expect(derivedSeed({ streamCode: 2 })).toBe(CANONICAL_SEED + 2_000_000);
  });

  it("rejects seeds outside uint32", () => {
    expect(() => derivedSeed({ streamCode: 5000 })).toThrow();
  });

  it("index helpers follow the frozen grids", () => {
    expect(SIGMA_MULTIPLIERS.map(sigmaIndexOf)).toEqual([0, 1, 2, 3]);
    expect(RHO_GRID.map((r) => rhoIndexOf("B", r))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(rhoIndexOf("A", null)).toBe(0);
    expect(modelIndexOf("A")).toBe(0);
    expect(modelIndexOf("B")).toBe(1);
    expect(() => sigmaIndexOf(3)).toThrow();
    expect(() => rhoIndexOf("B", 0.1)).toThrow();
    expect(() => rhoIndexOf("B", null)).toThrow();
  });

  it("main streams: Health substream 0, Perf substream 1", () => {
    const args = { protocolId: "BCV-030", personaIndex: 0, sigmaMultiplier: 1, model: "A", rho: null } as const;
    expect(mainStreamSeed(args, "perf") - mainStreamSeed(args, "health")).toBe(1);
  });

  it("is collision-free for main streams of every noise protocol", () => {
    for (const id of ["BCV-002", "BCV-029", "BCV-030"] as const) {
      const entries = enumerateMainStreamSeeds(id);
      expect(entries.length).toBe(12 * 4 * 8 * 2);
      expect(findSeedCollisions(entries)).toEqual([]);
    }
  });

  it("main-stream seeds differ across protocols", () => {
    const a = new Set(enumerateMainStreamSeeds("BCV-002").map((e) => e.seed));
    for (const e of enumerateMainStreamSeeds("BCV-030")) expect(a.has(e.seed)).toBe(false);
  });

  it("Model A and Model B@rho=0 receive different streams", () => {
    const base = { protocolId: "BCV-029", personaIndex: 4, sigmaMultiplier: 1.5 } as const;
    const a = mainStreamSeed({ ...base, model: "A", rho: null }, "health");
    const b = mainStreamSeed({ ...base, model: "B", rho: 0 }, "health");
    expect(a).not.toBe(b);
  });

  it("findSeedCollisions detects duplicates", () => {
    expect(
      findSeedCollisions([
        { label: "a", seed: 5 },
        { label: "b", seed: 5 },
        { label: "c", seed: 6 },
      ]),
    ).toEqual([{ seed: 5, labels: ["a", "b"] }]);
  });
});

describe("reversal substreams (§23.17.2)", () => {
  it("scoreBase Health=100, Perf=200; A=+2k, B=+2k+1", () => {
    expect(SCORE_BASE).toEqual({ health: 100, perf: 200 });
    expect(reversalSubstream("health", 0, "A")).toBe(100);
    expect(reversalSubstream("health", 0, "B")).toBe(101);
    expect(reversalSubstream("health", 7, "A")).toBe(114);
    expect(reversalSubstream("health", 7, "B")).toBe(115);
    expect(reversalSubstream("perf", 3, "A")).toBe(206);
    expect(reversalSubstream("perf", 3, "B")).toBe(207);
  });

  it("A/B seeds are all distinct within one configuration", () => {
    const args = { protocolId: "BCV-030", personaIndex: 1, sigmaMultiplier: 1, model: "B", rho: 0.25 } as const;
    const seen = new Set<number>();
    for (let k = 0; k < 2000; k++) {
      for (const r of ["A", "B"] as const) {
        const s = reversalSeed(args, "health", k, r);
        expect(seen.has(s)).toBe(false);
        seen.add(s);
      }
    }
  });
});

describe("membership", () => {
  it("has exactly 16 protocols", () => {
    expect(WAVE1_PROTOCOL_IDS).toHaveLength(16);
  });
});
