import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Human label of the section, e.g. "Orders" */
  label?: string;
  /** Changing this key resets the boundary (e.g. the active tab id) */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/runtime errors inside a dashboard section so a single broken
 * panel shows an inline message instead of blanking the whole dashboard.
 */
class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[TabErrorBoundary]", this.props.label, error, info);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return <>{this.props.children}</>;

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-base">
              {this.props.label ? `${this.props.label} could not load` : "This section could not load"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Something went wrong while rendering this section. The rest of your dashboard is unaffected.
            </p>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
              {error.message}
            </pre>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
                <RotateCcw size={14} className="mr-1.5" /> Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TabErrorBoundary;