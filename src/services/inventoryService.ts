/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TItemStock, TProductStock, TStocktakingLog } from '../types';

// Mock implementation of Inventory Service
const mockItemStocks: TItemStock[] = [
  { id: 's1', item_code: 'ITM-001', actual_stock: 120.5, updated_at: new Date().toISOString() },
  { id: 's2', item_code: 'ITM-002', actual_stock: 450, updated_at: new Date().toISOString() },
];

const mockProductStocks: TProductStock[] = [
  { id: 'ps1', product_code: 'PRD-001', mfg_lot: 'LOT-001', stock_cs: 10, stock_p: 0, expiry_date: '2025-12-31', updated_at: new Date().toISOString() },
  { id: 'ps2', product_code: 'PRD-001', mfg_lot: 'LOT-002', stock_cs: 5, stock_p: 6, expiry_date: '2025-11-30', updated_at: new Date().toISOString() },
];

export const inventoryService = {
  async getItemStocks(category?: string): Promise<TItemStock[]> {
    console.log('Fetching item stocks for', category);
    return mockItemStocks;
  },
  async getProductStocks(): Promise<TProductStock[]> {
    return mockProductStocks;
  },
  async saveStocktaking(adjustments: any, productAdjustments: any): Promise<void> {
    console.log('Saving stocktaking', adjustments, productAdjustments);
  },
  async getStocktakingLogs(): Promise<TStocktakingLog[]> {
    return [];
  },
  async confirmShipping(order: any, lotQuantities: any, shippingDate: string): Promise<void> {
    console.log('Confirming shipping', order, lotQuantities, shippingDate);
  }
};
