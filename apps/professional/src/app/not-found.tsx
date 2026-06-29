export default function NotFound() {
  return (
    <main style={{ padding: 48, color: "#f4f6f8", background: "#0b0d10", minHeight: "100vh" }}>
      <h1>Page not found</h1>
      <p style={{ color: "#9aa3b2" }}>This studio room does not exist yet.</p>
      <a href="/dashboard" style={{ color: "#9eb4ff" }}>
        Back to dashboard
      </a>
    </main>
  );
}
