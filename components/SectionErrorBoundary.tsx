"use client";

import * as React from "react";

interface State {
  error: Error | null;
}

interface Props {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps section trees so a runtime throw inside one section component
 * cannot crash the whole page. Brief §1 "Invalid Contentful data does
 * not crash the app".
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface in dev; in real prod this would go to a logger.
    if (process.env.NODE_ENV !== "production") {
      console.error("SectionErrorBoundary caught:", error, info);
    }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <section
            role="alert"
            aria-live="polite"
            className="border border-destructive/40 bg-destructive/10 text-destructive p-6 text-center text-sm"
          >
            <p>
              <strong>This section failed to render.</strong> Other content is still available.
            </p>
          </section>
        )
      );
    }
    return this.props.children;
  }
}
