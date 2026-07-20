"use client";

// Replaces the root layout when the shell itself crashes, so it must carry
// its own <html>/<body> and styling — the app's globals.css is gone here.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070a",
          color: "#f1f3f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: "40px 32px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 16,
            background: "rgba(255,255,255,0.035)",
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>LeadIntel hit a fatal error</h1>
          <p style={{ fontSize: 13, color: "#8b95a8", lineHeight: 1.6, marginBottom: 8 }}>
            The application shell failed to render. Reloading usually recovers this.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#525c6e", fontFamily: "monospace", marginBottom: 20 }}>
              error digest: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#4fd1c5",
              color: "#05201d",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
