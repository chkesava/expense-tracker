import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../../../components/ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class PortfolioErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Portfolio error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="bento-card p-8 text-center space-y-4">
            <AlertTriangle className="mx-auto text-amber-500" size={40} />
            <h3 className="text-lg font-bold">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">
              Portfolio data failed to load. Please try again.
            </p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Retry
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
