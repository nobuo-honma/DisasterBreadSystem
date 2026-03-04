import React from 'react';

export class ErrorBoundary extends (React.Component as any) {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full items-center justify-center p-10">
                    <div className="text-center space-y-4">
                        <p className="text-rose-400 font-black text-lg">予期しないエラーが発生しました</p>
                        <p className="text-slate-500 text-sm font-mono">{(this.state.error as any)?.message}</p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm"
                        >
                            再試行
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
