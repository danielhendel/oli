/**
 * RouteGuard / first-use routing source locks (Stage 2).
 */
import fs from "node:fs";
import path from "node:path";

import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

const ROOT = path.join(__dirname, "../../..");

function readRepoFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Stage 2 RouteGuard onboarding routing", () => {
  it("sends signed-out users to Opening, not directly to Home", () => {
    const rootLayout = readRepoFile("app/_layout.tsx");
    expect(rootLayout).toContain('"(onboarding)"');
    expect(rootLayout).toContain("useOnboardingGate");
    expect(rootLayout).toMatch(/router\.replace\("\/\(onboarding\)"\)/);
    expect(rootLayout).not.toMatch(/!user && !inAuthGroup[\s\S]*sign-in/);
  });

  it("deletion pending outranks onboarding trapping", () => {
    const rootLayout = readRepoFile("app/_layout.tsx");
    expect(rootLayout).toContain("deletion_pending");
    expect(rootLayout).toContain("delete-account");
    expect(rootLayout).toContain("isOwnershipEscapePath");
  });

  it("never replaces incomplete users straight to Home from auth success screens", () => {
    const signIn = readRepoFile("app/(auth)/sign-in.tsx");
    const signUp = readRepoFile("app/(auth)/sign-up.tsx");
    expect(signIn).not.toContain("CONSUMER_HOME_HREF");
    expect(signUp).not.toContain("CONSUMER_HOME_HREF");
    expect(signIn).toMatch(/RouteGuard/);
    expect(signUp).toMatch(/RouteGuard/);
  });

  it("keeps Home href for completed onboarding redirects", () => {
    const rootLayout = readRepoFile("app/_layout.tsx");
    expect(rootLayout).toContain("CONSUMER_HOME_HREF");
    expect(CONSUMER_HOME_HREF).toContain("dash");
  });

  it("exposes thin onboarding routes without Firebase in screens", () => {
    for (const rel of [
      "app/(onboarding)/index.tsx",
      "app/(onboarding)/about-you.tsx",
      "app/(onboarding)/connect.tsx",
      "app/(onboarding)/understand.tsx",
    ]) {
      const src = readRepoFile(rel);
      expect(src).not.toMatch(/firebase/i);
      expect(src).not.toMatch(/getFirestore|collection\(/);
    }
  });

  it("Connect and Understand routes are compatibility redirects only", () => {
    const connect = readRepoFile("app/(onboarding)/connect.tsx");
    const understand = readRepoFile("app/(onboarding)/understand.tsx");
    expect(connect).toContain("useConnectUnderstandCompatibilityRedirect");
    expect(understand).toContain("useConnectUnderstandCompatibilityRedirect");
    expect(connect).not.toContain("useConnectSources");
    expect(understand).not.toContain("useUnderstandReadiness");
  });
});
