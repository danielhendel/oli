/**
 * Deploy drift guard: Express index must mount sleep-day-refresh before gateway deploy.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const indexPath = join(__dirname, "..", "index.ts");

describe("services/api/src/index.ts — sleep-day-refresh route registration", () => {
  let source: string;

  beforeAll(() => {
    source = readFileSync(indexPath, "utf8");
  });

  it("imports the sleep-day-refresh router module", () => {
    expect(source).toContain('from "./routes/integrations/ouraSleepDayRefresh"');
  });

  it("mounts POST /integrations/oura/sleep-day-refresh behind authMiddleware", () => {
    expect(source).toContain(
      'app.use("/integrations/oura/sleep-day-refresh", authMiddleware, ouraSleepDayRefreshRouter)',
    );
  });
});
