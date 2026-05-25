'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 32,
            background: '#1a1b26',
            color: '#a9b1d6',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, marginBottom: 24, opacity: 0.7 }}>
            {error.message || 'An unexpected error occurred'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{
                padding: '8px 20px',
                background: '#7aa2f7',
                color: '#1a1b26',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 20px',
                background: 'transparent',
                color: '#a9b1d6',
                border: '1px solid #292e42',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
