import Link from "next/link";

import { StudioShell } from "@/components/StudioShell";
import { MOCK_CLIENTS } from "@/lib/mockClients";

export default function ClientsPage() {
  return (
    <StudioShell>
      <div className="page-header">
        <div className="page-eyebrow">Clients</div>
        <h1 className="page-title">Assigned clients</h1>
        <p className="page-subtitle">
          Prototype client list with mock data only. Real assignments and consent come in a later
          sprint.
        </p>
      </div>

      <div className="stack">
        {MOCK_CLIENTS.map((client) => (
          <article key={client.id} className="card row-between" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className="card-title">{client.name}</h2>
              <p className="card-copy">{client.subtitle}</p>
              <div className="meta-row">
                <span className="pill">{client.status}</span>
                <span className="pill">{client.goal}</span>
              </div>
            </div>
            <Link href={`/clients/${client.id}`} className="button button-primary">
              Open Client
            </Link>
          </article>
        ))}
      </div>
    </StudioShell>
  );
}
