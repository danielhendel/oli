"use client";

import { useRouter } from "next/navigation";

import { StudioShell } from "@/components/StudioShell";
import { useSession } from "@/lib/mockSession";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSession();

  return (
    <StudioShell>
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <div className="page-eyebrow">Prototype Access</div>
        <h1 className="page-title" style={{ fontSize: 36 }}>
          Welcome back, trainer.
        </h1>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          Mock login for the Professional Studio prototype. No Firebase Auth yet — local session
          only.
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            signIn("Daniel Hendel");
            router.push("/dashboard");
          }}
        >
          Continue as Daniel / Trainer
        </button>
      </div>
    </StudioShell>
  );
}
