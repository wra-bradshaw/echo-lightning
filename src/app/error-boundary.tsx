import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../shared/ui/button';

export class ErrorBoundary extends Component<{ children: ReactNode; onUseOriginal?: () => void }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lightning application error', error, info);
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Lightning could not load this page</h1>
          <p className="text-muted-foreground text-sm">The original Echo360 interface is still available.</p>
          <Button onClick={this.props.onUseOriginal}>Use original Echo UI</Button>
        </div>
      </div>
    );
  }
}
