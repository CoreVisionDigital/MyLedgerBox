import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      }
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900">
                Application Rendering Notice
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                A browser display exception occurred. You can refresh the session or reset local cache to continue uninterrupted.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
