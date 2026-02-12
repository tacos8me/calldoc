'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ErrorBoundary -- React class component for catching rendering errors.
// Displays a styled card with retry button and collapsible error details.
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback to render instead of the default error card */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  detailsOpen: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, detailsOpen: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, detailsOpen: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }));
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback;
      }

      // Default error card
      return (
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-status-danger/30 bg-surface-card shadow-md overflow-hidden">
            {/* Red accent bar */}
            <div className="h-1 w-full bg-status-danger" />

            <div className="p-6">
              {/* Icon + heading */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-danger-muted">
                  <AlertCircle className="h-5 w-5 text-status-danger" />
                </div>
                <div>
                  <h3 className="text-heading-md text-content-primary">
                    Something went wrong
                  </h3>
                  <p className="text-body-sm text-content-secondary mt-0.5">
                    An unexpected error occurred in this section.
                  </p>
                </div>
              </div>

              {/* Retry button */}
              <button
                onClick={this.handleReset}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2',
                  'bg-accent text-white text-body-sm font-medium',
                  'hover:bg-accent-hover transition-colors duration-fast',
                )}
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </button>

              {/* Collapsible error details */}
              <div className="mt-4">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1.5 text-caption text-content-tertiary hover:text-content-secondary transition-colors"
                >
                  {this.state.detailsOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Error details
                </button>
                {this.state.detailsOpen && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-surface-base p-3 text-mono-sm font-mono text-status-danger">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
