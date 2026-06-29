import Link from "next/link";

import { StudioShell } from "@/components/StudioShell";

export default function UnauthorizedPage() {
  return (
    <StudioShell>
      <div className="card" style={{ maxWidth: 560, margin: "60px auto" }}>
        <div className="page-eyebrow">Unauthorized</div>
        <h1 className="page-title" style={{ fontSize: 34 }}>
          You don&apos;t have access to this area yet.
        </h1>
        <p className="page-subtitle">
          Professional roles, assignments, and consent will be added in a future sprint.
        </p>
        <Link href="/login" className="button button-primary" style={{ marginTop: 18 }}>
          Return to login
        </Link>
      </div>
    </StudioShell>
  );
}
