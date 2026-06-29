import Link from "next/link";

import { StudioShell } from "@/components/StudioShell";
import { MOCK_CLIENTS } from "@/lib/mockClients";

export default function DashboardPage() {
  const selfClient = MOCK_CLIENTS[0];

  return (
    <StudioShell>
      <div className="page-header">
        <div className="page-eyebrow">Dashboard</div>
        <h1 className="page-title">Welcome to Oli Professional Studio</h1>
        <p className="page-subtitle">
          Today&apos;s focus: craft a workout experience that teaches, coordinates, and feels
          uniquely designed for your client.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Today&apos;s Focus</h2>
          <p className="card-copy">
            Build the first rich workout experience for your self-client prototype. Emphasize
            purpose, education, and feel — not sets-and-reps administration.
          </p>
          <div className="meta-row">
            <span className="pill">Prototype Sprint</span>
            <span className="pill">Workout Studio</span>
          </div>
        </section>

        {selfClient ? (
          <section className="card">
            <h2 className="card-title">{selfClient.name}</h2>
            <p className="card-copy">{selfClient.subtitle}</p>
            <div className="meta-row">
              <span className="pill">{selfClient.status}</span>
              <span className="pill">{selfClient.goal}</span>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/clients/self" className="button">
                Open Client
              </Link>
              <Link href="/studio/workouts/new" className="button button-primary">
                Open Workout Studio
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </StudioShell>
  );
}
