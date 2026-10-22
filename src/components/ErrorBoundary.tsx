import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { reportClientError } from "@/lib/errorReporter";

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
    void reportClientError({
      message: error?.message || "Unknown error",
      stack: `${error?.stack || ""}\nComponent stack:${info.componentStack || ""}`,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 sm:p-8">
          <AlertTriangle className="w-5 h-5 text-destructive mb-4" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight">This page hit an error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something broke while showing this screen. Your saved stagings are safe. Try again, or reload the page if it keeps happening.
          </p>
          {this.state.error?.message && (
            <p className="mt-4 rounded-md bg-card border border-border px-3 py-2 font-mono text-xs text-muted-foreground break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              onClick={this.handleReset}
              className="h-10 px-4 rounded-md border border-border bg-background hover:bg-card text-sm font-medium"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="gold-gradient-animated h-10 px-4 rounded-md text-sm font-medium"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
