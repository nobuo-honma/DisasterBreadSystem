/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/Dashboard';
// 【追加】Inventoryコンポーネントをインポート
import Inventory from './components/Inventory/Inventory';
import Orders from './components/orders/Orders';
import Shipping from './components/orders/Shipping';
import Receiving from './components/orders/Receiving';
import Manufacturing from './components/orders/Manufacturing';
import ProductsMaster from './components/masters/ProductsMaster';
import ItemsMaster from './components/masters/ItemsMaster';
import BOMMaster from './components/masters/BOMMaster';
import DestinationsMaster from './components/masters/DestinationsMaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import UsersMaster from './components/masters/UsersMaster';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      // 【追加】inventoryタブが選択された時の処理
      case 'inventory':
        return <Inventory />;
      case 'orders':
        return <Orders />;
      case 'shipping':
        return <Shipping />;
      case 'receiving':
        return <Receiving />;
      case 'manufacturing':
        return <Manufacturing />;
      case 'products':
        return <ProductsMaster />;
      case 'items':
        return <ItemsMaster />;
      case 'bom':
        return <BOMMaster />;
      case 'destinations':
        return <DestinationsMaster />;
      case 'users':
        return <UsersMaster />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div key={activeTab} className="contents">
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
}