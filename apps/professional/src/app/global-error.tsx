"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0d10", color: "#f4f6f8", fontFamily: "system-ui" }}>
        <div style={{ padding: 48, maxWidth: 560 }}>
          <h1 style={{ fontSize: 32, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: "#9aa3b2", lineHeight: 1.6 }}>
            The studio hit an unexpected error. This is a prototype — try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "12px 18px",
              borderRadius: 999,
              border: "none",
              background: "#5476f5",
              color: "white",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
