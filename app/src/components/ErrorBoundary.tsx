
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
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
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-gray-900">
                    <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
                        <p className="mb-4 text-gray-600">
                            The application encountered an unexpected error.
                        </p>
                        <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-48 mb-6 text-sm font-mono">
                            {this.state.error?.toString()}
                        </div>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
