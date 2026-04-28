import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background grain-overlay flex items-center justify-center p-6 relative overflow-hidden">
          {/* Ambient gold glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(38 60% 55% / 0.06) 0%, transparent 60%)",
            }}
          />

          <div className="relative text-center max-w-lg">
            <p className="font-body text-[10px] tracking-[0.4em] uppercase text-accent mb-6">
              Unexpected Interruption
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-light mb-5 leading-[1.05]">
              Something went <span className="italic text-accent">awry</span>
            </h1>
            <p className="font-body text-sm text-muted-foreground mb-2 leading-relaxed">
              We encountered an issue while rendering this view. Your work is safe.
            </p>
            {this.state.error?.message && (
              <p className="font-body text-xs text-muted-foreground/60 italic mb-8 px-4">
                {this.state.error.message}
              </p>
            )}

            {/* Gold divider */}
            <div
              className="mx-auto mb-8"
              style={{
                width: 80,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.5), transparent)",
              }}
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="font-body text-xs tracking-[0.2em] uppercase border border-foreground/20 hover:border-accent/50 text-foreground/80 hover:text-accent px-7 py-3 rounded-lg transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="gold-gradient-animated text-accent-foreground font-body font-semibold text-xs tracking-[0.2em] uppercase px-7 py-3 rounded-lg hover:opacity-90"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
