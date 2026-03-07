/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** エラー時に表示するカスタムフォールバック（任意） */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * アプリケーションのランタイムエラーをキャッチし、
 * UIの完全な崩壊を防ぐためのコンポーネント。
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 次のレンダリングでフォールバックUIを表示する
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ここで Sentry などの外部ログ監視サービスにエラーを送信するのが一般的です
    console.group("🔴 ErrorBoundary Caught Exception");
    console.error("Error Object:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.groupEnd();
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // 必要に応じて、ページのリロードや状態のクリアを行う
    // window.location.reload(); 
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックが渡されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラー表示UI
      return (
        <div className="flex min-h-[400px] w-full items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
          <div className="max-w-md w-full bg-slate-900/50 border border-rose-500/20 rounded-4xl p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="inline-flex p-4 bg-rose-500/10 rounded-full text-rose-500 mb-2">
              <AlertCircle size={48} strokeWidth={1.5} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                Runtime Error <span className="text-rose-500/80">Detected</span>
              </h2>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                アプリケーションの実行中に予期しない問題が発生しました。
                データは保護されています。
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                <p className="text-[10px] font-mono text-rose-400 text-left whitespace-pre-wrap leading-tight italic">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-4xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg group"
            >
              <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
              システムを再試行
            </button>
            
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              Security Protocol Level 4 Active
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}