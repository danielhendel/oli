import fs from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "__tests__") continue;
      out.push(...walk(p));
    } else if (/\.(tsx?)$/.test(ent.name)) out.push(p);
  }
  return out;
}

/** Common pre-dark-theme iOS label grays — prefer UI_TEXT_* / UI_BORDER_* / UI_SURFACE_* tokens. */
const LEGACY_LIGHT_MODE_GRAY = /#1C1C1E|#8E8E93|#3C3C43|#636366|#6E6E73|#AEAEB2|#D1D1D6|#EBEBEF/;

describe("lib/ui/workouts card styling", () => {
  it("does not reintroduce legacy light-mode hex grays outside shadow-only lines", () => {
    const root = path.join(__dirname, "..");
    const offenders: string[] = [];
    for (const file of walk(root)) {
      const raw = fs.readFileSync(file, "utf8");
      const stripped = raw
        .split("\n")
        .filter((line) => !line.includes('shadowColor: "#000000"'))
        .join("\n");
      if (LEGACY_LIGHT_MODE_GRAY.test(stripped)) {
        offenders.push(path.relative(root, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
