'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-loss-red/10">
            <AlertTriangle className="h-8 w-8 text-loss-red" />
          </div>
          <h3 className="font-heading text-lg font-bold text-text-primary">Page failed to load</h3>
          <p className="text-sm text-text-secondary text-center max-w-sm">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-surface-alt transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
