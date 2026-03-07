/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import type { TReceiving } from '../types';

export const receivingService = {
  /**
   * 入荷予定一覧の取得（予定日の近い順）
   */
  async getReceivings(): Promise<TReceiving[]> {
    const { data, error } = await supabase
      .from('t_receiving')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('[receivingService] getReceivings failed:', error);
      throw new Error('入荷データの取得に失敗しました');
    }
    return data ?? [];
  },

  /**
   * 入荷予定の保存（新規・更新）
   */
  async saveReceiving(rec: Partial<TReceiving>): Promise<void> {
    const { error } = await supabase
      .from('t_receiving')
      .upsert({
        ...rec,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * 入荷確定処理 (検収)
   * 入荷情報の更新、在庫の加算、履歴の記録を順次実行します。
   */
  async processReceiving(row: TReceiving, actualQty: number): Promise<void> {
    // 1. 二重処理の防止ガード
    if (row.status === '入荷済') {
      throw new Error('このレコードは既に入荷処理が完了しています');
    }

    // 2. ステータスの判定
    const status: TReceiving['status'] =
      actualQty >= row.order_quantity ? '入荷済' : '一部入荷';

    try {
      // 3. 入荷予定レコードの更新
      const { error: recErr } = await supabase
        .from('t_receiving')
        .update({ 
          actual_quantity: actualQty, 
          status,
          received_at: new Date().toISOString() 
        })
        .eq('id', row.id);

      if (recErr) throw recErr;

      // 4. 品目在庫（資材・原料）への反映
      // Note: 確実に最新の在庫数をもとに加算するため、DBから再取得
      const { data: current, error: fetchErr } = await supabase
        .from('t_item_stock')
        .select('actual_stock')
        .eq('item_code', row.item_code)
        .single();

      if (fetchErr) throw new Error(`在庫情報の取得に失敗しました: ${row.item_code}`);

      const beforeStock = current?.actual_stock ?? 0;
      const { error: stockErr } = await supabase
        .from('t_item_stock')
        .update({ 
          actual_stock: beforeStock + actualQty,
          updated_at: new Date().toISOString()
        })
        .eq('item_code', row.item_code);

      if (stockErr) throw stockErr;

      // 5. 在庫変動ログの記録
      const { error: logErr } = await supabase
        .from('t_stock_log')
        .insert({
          tx_type: '入荷',
          target_type: '品目',
          item_code: row.item_code,
          before_quantity: beforeStock,
          quantity: actualQty,
          after_quantity: beforeStock + actualQty,
          related_code: row.receiving_code,
          remarks: `入荷確定: ${row.receiving_code} (${actualQty}${row.unit || '個'})`,
          created_at: new Date().toISOString()
        });

      if (logErr) throw logErr;

    } catch (err) {
      console.error('[receivingService] processReceiving failed:', err);
      throw new Error(`入荷処理中にエラーが発生しました。在庫状況を確認してください。`);
    }
  },
};