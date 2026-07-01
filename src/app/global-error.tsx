"use client";

// Last-resort boundary if the root layout itself throws. It replaces everything, so it has
// to render its own <html>/<body>.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          background: "#fafaf7",
          color: "#1a1a18",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#6b6b66", marginTop: 8 }}>Reload the page to try again.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#0f9e72",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
