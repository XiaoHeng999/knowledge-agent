'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Minimal mode: no "Report Issue" button, just reload */
  minimal?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRefreshPage = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const error = this.state.error;

    if (this.props.minimal) {
      return (
        <div className="error-boundary error-boundary--minimal">
          <p className="error-boundary__message">Something went wrong.</p>
          <button className="error-boundary__btn" onClick={this.handleReload} type="button">
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 16 16" fill="var(--error)">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm-3.146-4.146a.5.5 0 0 1-.708-.708L7.293 8 4.146 4.854a.5.5 0 1 1 .708-.708L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647z" />
          </svg>
        </div>
        <h2 className="error-boundary__title">Rendering Error</h2>
        <p className="error-boundary__message">
          This section encountered an error and could not render.
        </p>
        {error && process.env.NODE_ENV === 'development' && (
          <pre className="error-boundary__stack">{error.message}</pre>
        )}
        <div className="error-boundary__actions">
          <button className="error-boundary__btn error-boundary__btn--primary" onClick={this.handleReload} type="button">
            Reload Section
          </button>
          <button className="error-boundary__btn" onClick={this.handleRefreshPage} type="button">
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
