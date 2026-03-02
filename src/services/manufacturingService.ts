/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TMfgPlan, TOrder, TProductStock } from '../types';

// Mock implementation of Manufacturing Service
const mockPlans: Record<string, TMfgPlan[]> = {
  'ORD-1001': [
    {
      id: 'plan-1',
      plan_code: 'PLAN-ORD-1001-001',
      order_code: 'ORD-1001',
      product_code: 'PRD-001',
      scheduled_date: '2025-05-20',
      amount_kg: 500,
      amount_cs: 41,
      status: '計画',
      remarks: '通常製造'
    }
  ]
};

export const manufacturingService = {
  async getPlansByOrder(orderCode: string): Promise<TMfgPlan[]> {
    return mockPlans[orderCode] || [];
  },

  async getAllPlans(): Promise<TMfgPlan[]> {
    return Object.values(mockPlans).flat();
  },

  async savePlans(orderCode: string, plans: Partial<TMfgPlan>[]): Promise<void> {
    console.log('Saving plans for order', orderCode, plans);
    // In a real app, this would update the database
  },

  async updatePlanStatus(planId: string, status: string): Promise<void> {
    console.log('Updating plan status', planId, status);
  },

  async updatePlanDate(planId: string, date: string): Promise<void> {
    console.log('Updating plan date', planId, date);
  },

  async saveProductionResult(result: Partial<TProductStock>): Promise<void> {
    console.log('Saving production result', result);
  }
};
