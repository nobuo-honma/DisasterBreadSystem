/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import type { TOrder } from '../types';

export const orderService = {
  /**
   * 受注一覧の取得（最新の受注日順）
   */
  async getOrders(): Promise<TOrder[]> {
    const { data, error } = await supabase
      .from('t_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) {
      console.error('[orderService] getOrders failed:', error);
      throw new Error('受注一覧の取得に失敗しました');
    }
    return data ?? [];
  },

  /**
   * 未完了の受注を取得（納品希望日の近い順）
   * 完了・出荷済・キャンセル以外の「動いている受注」を抽出
   */
  async getPendingOrders(): Promise<TOrder[]> {
    const { data, error } = await supabase
      .from('t_orders')
      .select('*')
      // Supabaseのフィルタ構文を修正: .not().in() の正しい記述
      .not('status', 'in', '("完了", "出荷済", "キャンセル")')
      .order('request_delivery_date', { ascending: true });

    if (error) {
      console.error('[orderService] getPendingOrders failed:', error);
      throw new Error('未完了受注の取得に失敗しました');
    }
    return data ?? [];
  },

  /**
   * 受注データの保存（新規・更新）
   * 今後の拡張（受注明細 _orderDetails）を考慮した構造に整理
   */
  async saveOrder(
    orderHeader: Partial<TOrder>,
    _orderDetails?: unknown[] // 明細テーブルへの展開用（将来の拡張）
  ): Promise<void> {
    const payload = {
      ...orderHeader,
      updated_at: new Date().toISOString(),
    };

    // upsertを使用することで、IDがあれば更新、なければ挿入を自動化
    const { error } = await supabase
      .from('t_orders')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[orderService] saveOrder failed:', error);
      throw new Error('受注データの保存中にエラーが発生しました');
    }
  },

  /**
   * 受注ステータスの更新
   */
  async updateStatus(id: string, status: TOrder['status']): Promise<void> {
    const { error } = await supabase
      .from('t_orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('[orderService] updateStatus failed:', error);
      throw new Error('ステータスの更新に失敗しました');
    }
  },
};