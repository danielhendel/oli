import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioShell } from "@/components/StudioShell";
import { getMockClient } from "@/lib/mockClients";

export default async function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = getMockClient(id);
  if (!client) notFound();

  return (
    <StudioShell>
      <div className="page-header">
        <div className="page-eyebrow">Client Workspace</div>
        <h1 className="page-title">{client.name}</h1>
        <p className="page-subtitle">{client.subtitle}</p>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Client Context</h2>
          <div className="stack">
            <div>
              <div className="small muted">Goal</div>
              <div>{client.goal}</div>
            </div>
            <div>
              <div className="small muted">Experience</div>
              <div>{client.experience}</div>
            </div>
            <div>
              <div className="small muted">Constraints</div>
              <div>{client.constraints}</div>
            </div>
            <div>
              <div className="small muted">Recovery Capacity</div>
              <div>{client.recoveryCapacity}</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Health Journey Placeholders</h2>
          <div className="stack">
            <div className="card card-muted">
              <div className="small muted">Current State</div>
              <div>Assessment evidence will appear here once persisted server-side.</div>
            </div>
            <div className="card card-muted">
              <div className="small muted">Health Baseline</div>
              <div>Derived baseline summary placeholder for professional review.</div>
            </div>
            <div className="card card-muted">
              <div className="small muted">Target State</div>
              <div>{client.targetState}</div>
            </div>
          </div>
        </section>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/studio/workouts/new" className="button button-primary">
          Open Workout Studio
        </Link>
      </div>
    </StudioShell>
  );
}
