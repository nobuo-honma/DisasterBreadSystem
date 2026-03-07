/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import type { MProduct, MItem, MBom, MDestination, MUser } from '../types';

/**
 * 共通の保存（Upsert）ロジック
 * IDの有無によってInsert/Updateを自動的に切り替えます
 */
async function upsertData<T extends { id?: string | number }>(
  table: string,
  data: Partial<T>
) {
  const { error } = await supabase
    .from(table)
    .upsert(data, { onConflict: 'id' });
  
  if (error) {
    console.error(`[masterService] Failed to upsert ${table}:`, error);
    throw new Error(`${table} の保存に失敗しました`);
  }
}

export const masterService = {
  // --- 製品マスタ ---
  async getProducts(): Promise<MProduct[]> {
    const { data, error } = await supabase
      .from('m_products')
      .select('*')
      .order('product_code', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveProduct(product: Partial<MProduct>): Promise<void> {
    await upsertData('m_products', product);
  },

  // --- 品目マスタ (原料・資材) ---
  async getItems(): Promise<MItem[]> {
    const { data, error } = await supabase
      .from('m_items')
      .select('*')
      .order('item_code', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveItem(item: Partial<MItem>): Promise<void> {
    await upsertData('m_items', item);
  },

  // --- BOM (部品表) ---
  async getBOM(productCode: string): Promise<MBom[]> {
    const { data, error } = await supabase
      .from('m_bom')
      .select('*')
      .eq('product_code', productCode)
      .order('item_code', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * BOMを更新
   * 全置換方式を採用。既存を削除してから一括挿入します。
   */
  async saveBOM(productCode: string, entries: Partial<MBom>[]): Promise<void> {
    if (!productCode) throw new Error('製品コードが指定されていません');

    // 1. 既存BOMの削除
    const { error: delErr } = await supabase
      .from('m_bom')
      .delete()
      .eq('product_code', productCode);
    
    if (delErr) throw delErr;

    // 2. 新規BOMの登録 (バルクインサート)
    if (entries.length > 0) {
      const rows = entries.map(e => ({ 
        ...e, 
        product_code: productCode,
        updated_at: new Date().toISOString()
      }));
      
      const { error: insErr } = await supabase
        .from('m_bom')
        .insert(rows);
      
      if (insErr) throw insErr;
    }
  },

  // --- 出荷先マスタ ---
  async getDestinations(): Promise<MDestination[]> {
    const { data, error } = await supabase
      .from('m_destinations')
      .select('*')
      .order('destination_code', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveDestination(dest: Partial<MDestination>): Promise<void> {
    await upsertData('m_destinations', dest);
  },

  // --- ユーザー管理 (Supabase Auth 連携用) ---
  async getUsers(): Promise<MUser[]> {
    // ユーザー情報は公開情報のみを 'm_users' テーブル等に同期させている前提の実装
    const { data, error } = await supabase
      .from('m_users')
      .select('*')
      .order('name');
    
    if (error) {
      console.warn('Auth管理下のユーザー情報を取得できませんでした。');
      return [];
    }
    return data ?? [];
  },
};