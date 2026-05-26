'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  /** Name shown in the fallback UI, e.g. "Canvas", "Panel" */
  region?: string;
  /** Optional custom fallback component */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable component-level error boundary.
 * Wraps critical UI regions (Canvas, Panels, PresentMode) so a crash in one
 * region doesn't take down the entire editor.
 */
export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ComponentErrorBoundary:${this.props.region ?? 'unknown'}]`, error, errorInfo);
    Sentry.captureException(error, {
      extra: {
        region: this.props.region,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[120px] bg-neutral-50/80 backdrop-blur-sm rounded-lg p-6 gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-700">
            {this.props.region ? `${this.props.region} encountered an error` : 'Something went wrong'}
          </p>
          <p className="text-xs text-neutral-400 max-w-[300px] text-center break-words">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-1 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
