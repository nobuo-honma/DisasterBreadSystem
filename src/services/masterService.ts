/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MProduct, MItem, MBom, MDestination, MUser } from '../types';

// Mock implementation of Master Data Service
const mockProducts: MProduct[] = [
  { id: 'p1', product_code: 'PRD-001', product_name: 'Product A', unit_cs_to_p: 12, is_active: true },
  { id: 'p2', product_code: 'PRD-002', product_name: 'Product B', unit_cs_to_p: 24, is_active: true },
];

const mockItems: MItem[] = [
  { id: 'i1', item_code: 'ITM-001', item_name: 'Material X', category: 'Raw Material', unit: 'kg', safety_stock: 100, is_active: true },
  { id: 'i2', item_code: 'ITM-002', item_name: 'Material Y', category: 'Packaging', unit: 'pcs', safety_stock: 500, is_active: true },
];

const mockDestinations: MDestination[] = [
  { id: 'd1', dest_code: 'DST-001', dest_name: 'Customer A', dest_type: 'Customer', is_active: true },
  { id: 'd2', dest_code: 'DST-002', dest_name: 'Supplier B', dest_type: 'Supplier', is_active: true },
];

const mockUsers: MUser[] = [
  { id: 'u1', username: 'admin', email: 'admin@example.com', role: 'Admin', is_active: true },
  { id: 'u2', username: 'user1', email: 'user1@example.com', role: 'User', is_active: true },
];

export const masterService = {
  // Products
  async getProducts(): Promise<MProduct[]> {
    return mockProducts;
  },
  async saveProduct(product: Partial<MProduct>): Promise<void> {
    console.log('Saving product', product);
  },

  // Items
  async getItems(): Promise<MItem[]> {
    return mockItems;
  },
  async saveItem(item: Partial<MItem>): Promise<void> {
    console.log('Saving item', item);
  },

  // BOM
  async getBOM(productId: string): Promise<MBom[]> {
    console.log('Fetching BOM for', productId);
    return [
      { id: 'b1', product_id: productId, product_code: 'PRD-001', item_id: 'i1', item_code: 'ITM-001', quantity: 0.5 },
    ];
  },
  async saveBOM(productId: string, entries: Partial<MBom>[]): Promise<void> {
    console.log('Saving BOM for', productId, entries);
  },

  // Destinations
  async getDestinations(): Promise<MDestination[]> {
    return mockDestinations;
  },
  async saveDestination(dest: Partial<MDestination>): Promise<void> {
    console.log('Saving destination', dest);
  },

  // Users
  async getUsers(): Promise<MUser[]> {
    return mockUsers;
  },
  async saveUser(user: Partial<MUser>): Promise<void> {
    console.log('Saving user', user);
  }
};
