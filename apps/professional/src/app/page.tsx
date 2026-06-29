import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <div className="page-header">
        <div className="page-eyebrow">Oli Professional Studio</div>
        <h1 className="page-title">Design living health systems.</h1>
        <p className="page-subtitle">
          The creative studio where health professionals craft thoughtful, educational, and
          beautifully coordinated experiences — not spreadsheets.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/dashboard" className="button button-primary">
          Enter Studio
        </Link>
        <Link href="/login" className="button">
          Sign in
        </Link>
      </div>
    </div>
  );
}
