import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="max-w-md w-full p-6 bg-card border border-border rounded-xl shadow-xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-1">A render error occurred in the UI.</p>
            </div>
            <pre className="text-left text-xs bg-secondary/60 rounded-lg p-3 overflow-auto max-h-40 text-red-400 font-mono">
              {this.state.error.message}
            </pre>
            <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
