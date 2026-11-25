import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    let friendly = error.message || "An unexpected error occurred.";
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && typeof parsed.error === "string") {
        if (parsed.error.toLowerCase().includes("permission") || parsed.error.toLowerCase().includes("insufficient")) {
          friendly = `Database access denied during ${parsed.operationType ?? "operation"} on ${parsed.path ?? "protected resource"}. Please ensure you are signed in with an authorized administrator account.`;
        } else {
          friendly = parsed.error;
        }
      }
    } catch {
      // Not a JSON-encoded FirestoreErrorInfo
    }
    return { hasError: true, message: friendly };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-panel-strong w-full max-w-md rounded-2xl border border-red-500/30 p-6 text-center shadow-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-400">
              <AlertTriangle className="size-6" />
            </div>
            <h1 className="mt-4 font-display text-lg font-bold text-[var(--foreground)]">
              Access or Connection Notice
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: "" });
                window.location.reload();
              }}
              className="btn-futuristic mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <RotateCcw className="size-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
