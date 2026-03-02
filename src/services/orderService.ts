/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TOrder } from '../types';

// Mock implementation of Order Service
const mockOrders: TOrder[] = [
  {
    id: 'o1',
    order_code: 'ORD-1001',
    order_date: '2025-05-15',
    destination_code: 'DST-001',
    request_delivery_date: '2025-05-20',
    product_code: 'PRD-001',
    product_name_at_order: 'Product A',
    quantity_cs: 50,
    status: '未出荷',
    remarks: '味:バニラ | 特急'
  },
  {
    id: 'o2',
    order_code: 'ORD-1002',
    order_date: '2025-05-16',
    destination_code: 'DST-002',
    request_delivery_date: '2025-05-22',
    product_code: 'PRD-002',
    product_name_at_order: 'Product B',
    quantity_cs: 100,
    status: '未出荷',
    remarks: '味:チョコ'
  }
];

export const orderService = {
  async saveOrder(orderHeader: any, orderDetails: any[]): Promise<void> {
    console.log('Saving order', orderHeader, orderDetails);
  },
  async getPendingOrders(): Promise<TOrder[]> {
    return mockOrders;
  },
  async getOrders(): Promise<TOrder[]> {
    return mockOrders;
  }
};
