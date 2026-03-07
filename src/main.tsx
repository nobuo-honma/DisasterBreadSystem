/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// グローバルスタイルのインポート（Tailwind CSS を含む）
import './index.css';

/**
 * ルート要素の取得とバリデーション
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  // index.html に id="root" が存在しない場合の致命的エラーを早期検知
  const errorMsg = 'Failed to find the root element. Ensure index.html has <div id="root"></div>';
  console.error(`[Critical Error] ${errorMsg}`);
  throw new Error(errorMsg);
}

/**
 * React アプリケーションのレンダリング
 */
createRoot(rootElement).render(
  <StrictMode>
    {/* 将来的に Context Provider (Auth, Theme, QueryClient 等) を
      追加する場合は、App をラップするようにここに配置します。
    */}
    <App />
  </StrictMode>,
);

/**
 * パフォーマンスモニタリング (Vitals)
 * 本番環境でのユーザー体験（表示速度等）を計測する場合、ここにロジックを挿入します。
 */
if (import.meta.env.PROD) {
  // 例: Web Vitals の計測開始
  // import('./reportWebVitals').then((report) => report.default(console.log));
}