/**
 * ErrorBoundary.tsx
 *
 * A React class component that catches any unhandled rendering errors thrown
 * by its children and swaps in a fallback UI instead of crashing the whole app.
 *
 * Why a class component?
 *   React only exposes error-boundary functionality through two class lifecycle
 *   methods — getDerivedStateFromError and componentDidCatch — which are not
 *   available in function components.
 *   See: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourScreen />
 *   </ErrorBoundary>
 *
 *   Or with a custom fallback:
 *   <ErrorBoundary FallbackComponent={MyFallback} onError={logError}>
 *     <YourScreen />
 *   </ErrorBoundary>
 */

import React, { Component, ComponentType, PropsWithChildren } from "react";

import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  /** Custom fallback component to show when an error is caught. Defaults to ErrorFallback. */
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Optional callback invoked with the error and its component stack trace. */
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  /** Use ErrorFallback as the default UI when no custom FallbackComponent is provided. */
  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  /**
   * Called during the render phase when a descendant throws.
   * Returns the new state to show the fallback instead of crashing.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  /**
   * Called after the render phase when a descendant throws.
   * Forwards the error and component stack to the optional onError callback
   * (useful for logging to Sentry, Crashlytics, etc.).
   */
  componentDidCatch(error: Error, info: { componentStack: string }): void {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  /** Clears the error state so the children are rendered again (retry). */
  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    // If an error was caught, show the fallback UI; otherwise render children normally
    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
