'use client';

/**
 * React Error Boundary that captures render errors to Sentry.
 * Use this to wrap client components that might throw.
 *
 * @example
 * <ErrorBoundary namespace="WarrantyCard" fallback={<ErrorFallback />}>
 *   <WarrantyCard warranty={w} />
 * </ErrorBoundary>
 */

import * as Sentry from "@sentry/nextjs";
import { Component, type ReactNode, type ErrorInfo } from "react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  namespace: string;
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, namespace: string) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: crypto.randomUUID?.() ?? Date.now().toString(36),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID?.() ?? Date.now().toString(36),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { namespace, onError } = this.props;

    this.setState({ errorInfo });

    // Log to our logger
    logger.error(namespace, `ErrorBoundary caught: ${error.message}`, {
      errorId: this.state.errorId,
      errorName: error.name,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: namespace,
    });

    // Capture to Sentry
    Sentry.withScope((scope) => {
      scope.setTag("error_boundary", namespace);
      scope.setTag("error_id", this.state.errorId);
      scope.setContext("error_boundary", {
        namespace,
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error, { extra: { errorInfo } });
    });

    // Callback
    onError?.(error, errorInfo, namespace);
  }

  render() {
    if (this.state.hasError) {
      const { fallback, namespace } = this.props;

      if (fallback) return fallback;

      // Default fallback UI
      return (
        <div
          role="alert"
          style={{
            padding: "16px",
            background: "rgba(239,68,68,0.08)",
            border: "1.5px solid rgba(239,68,68,0.35)",
            borderRadius: "10px",
            margin: "12px 0",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626", margin: "0 0 6px" }}>
            ⚠️ Something went wrong
          </p>
          <p style={{ fontSize: "12px", color: "#7f1d1d", margin: "0 0 4px" }}>
            Component: <code>{namespace}</code>
          </p>
          <p style={{ fontSize: "12px", color: "#7f1d1d", margin: "0 0 4px" }}>
            Error ID: <code style={{ fontSize: "11px" }}>{this.state.errorId}</code>
          </p>
          {this.state.error?.message && (
            <p style={{ fontSize: "12px", color: "#7f1d1d", margin: "0 0 6px", fontWeight: 600 }}>
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              marginTop: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
