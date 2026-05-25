'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-boundary error-boundary--global" role="alert">
      <div className="error-boundary__icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 16 16" fill="var(--error)">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm-3.146-4.146a.5.5 0 0 1-.708-.708L7.293 8 4.146 4.854a.5.5 0 1 1 .708-.708L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647z" />
        </svg>
      </div>
      <h2 className="error-boundary__title">Something went wrong</h2>
      <p className="error-boundary__message">
        An unexpected error occurred. Your data has been preserved.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="error-boundary__stack">{error.message}</pre>
      )}
      <div className="error-boundary__actions">
        <button
          className="error-boundary__btn error-boundary__btn--primary"
          onClick={reset}
          type="button"
        >
          Try Again
        </button>
        <button
          className="error-boundary__btn"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload App
        </button>
      </div>
    </div>
  );
}
