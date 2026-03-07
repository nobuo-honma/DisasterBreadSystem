/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, Suspense } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

// コンポーネントのインポート
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory/Inventory';
import Orders from './components/orders/Orders';
import Shipping from './components/orders/Shipping';
import Receiving from './components/orders/Receiving';
import Manufacturing from './components/orders/Manufacturing';
import ProductsMaster from './components/masters/ProductsMaster';
import ItemsMaster from './components/masters/ItemsMaster';
import BOMMaster from './components/masters/BOMMaster';
import DestinationsMaster from './components/masters/DestinationsMaster';
import UsersMaster from './components/masters/UsersMaster';

/**
 * アプリケーションのルートコンポーネント
 * 状態管理とルーティング（タブ切り替え）を担います。
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // タブに応じたコンテンツのレンダリング
  // useMemo を使用することで、不要な再計算を抑制します
  const content = useMemo(() => {
    switch (activeTab) {
      case 'dashboard':     return <Dashboard />;
      case 'inventory':     return <Inventory />;
      case 'orders':        return <Orders />;
      case 'shipping':      return <Shipping />;
      case 'receiving':     return <Receiving />;
      case 'manufacturing': return <Manufacturing />;
      case 'products':      return <ProductsMaster />;
      case 'items':         return <ItemsMaster />;
      case 'bom':           return <BOMMaster />;
      case 'destinations':  return <DestinationsMaster />;
      case 'users':         return <UsersMaster />;
      default:              return <Dashboard />;
    }
  }, [activeTab]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* ErrorBoundary をレイアウト内部のコンテンツ領域に配置することで、
        サイドバーなどの共通UIを残したまま、特定機能のエラーだけをキャッチ・復旧できます。
      */}
      <ErrorBoundary key={activeTab}>
        <main className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Suspense fallback={<LoadingSpinner />}>
            {content}
          </Suspense>
        </main>
      </ErrorBoundary>
    </DashboardLayout>
  );
}

/**
 * 簡易ローディングインジケーター
 */
function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-rose-500" />
    </div>
  );
}