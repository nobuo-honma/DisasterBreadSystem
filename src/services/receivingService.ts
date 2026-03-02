/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TReceiving } from '../types';

// Mock implementation of Receiving Service
const mockReceivings: TReceiving[] = [
  { id: 'r1', receiving_code: 'REC-001', item_code: 'ITM-001', scheduled_date: '2025-05-20', order_quantity: 100, actual_quantity: 100, status: '入荷済' },
  { id: 'r2', receiving_code: 'REC-002', item_code: 'ITM-002', scheduled_date: '2025-05-22', order_quantity: 500, status: '未入荷' },
];

export const receivingService = {
  async getReceivings(): Promise<TReceiving[]> {
    return mockReceivings;
  },
  async saveReceiving(rec: Partial<TReceiving>): Promise<void> {
    console.log('Saving receiving', rec);
  },
  async getReceivingList(): Promise<TReceiving[]> {
    return mockReceivings;
  },
  async registerReceiving(data: Partial<TReceiving>): Promise<void> {
    console.log('Registering receiving', data);
  },
  async processReceiving(row: TReceiving, actualQty: number): Promise<void> {
    console.log('Processing receiving', row, actualQty);
  }
};
