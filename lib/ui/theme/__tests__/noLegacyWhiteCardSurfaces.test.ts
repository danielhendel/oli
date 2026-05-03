import fs from "node:fs";
import path from "node:path";

/** Ensures we don't regress to literal white card shells in shared UI (presentation-only check). */
function walkTs(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, acc);
    else if (/\.(tsx|ts)$/.test(ent.name) && !ent.name.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}

const WHITE_CARD_BG_RE = /backgroundColor:\s*["']#FFFFFF["']/;

describe("no legacy white literal card backgrounds in lib/ui", () => {
  it("lib/ui contains no StyleSheet-style white card shells", () => {
    const root = path.join(process.cwd(), "lib/ui");
    const offenders: string[] = [];
    for (const file of walkTs(root)) {
      if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
      if (file.endsWith("oliSemantic.ts")) continue;
      const s = fs.readFileSync(file, "utf8");
      if (WHITE_CARD_BG_RE.test(s)) offenders.push(path.relative(process.cwd(), file));
    }
    expect(offenders).toEqual([]);
  });
});
