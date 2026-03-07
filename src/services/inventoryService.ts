/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import type { TItemStock, TProductStock, TStocktakingLog } from '../types';

export const inventoryService = {
  /**
   * 資材・原料在庫一覧の取得
   */
  async getItemStocks(category?: string): Promise<TItemStock[]> {
    let query = supabase
      .from('t_item_stock')
      .select('*')
      .order('item_code');

    if (category) {
      // プレフィックス検索による簡易フィルタリング
      query = query.like('item_code', `${category}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[inventoryService] getItemStocks failed:', error);
      throw new Error('在庫データの取得に失敗しました');
    }
    return data ?? [];
  },

  /**
   * 製品在庫一覧の取得（賞味期限の近い順）
   */
  async getProductStocks(): Promise<TProductStock[]> {
    const { data, error } = await supabase
      .from('t_product_stock')
      .select('*')
      .order('expiry_date', { ascending: true });
    
    if (error) throw error;
    return data ?? [];
  },

  /**
   * 棚卸データの保存
   * ループによる逐次処理から、整合性を高めるためのエラーハンドリングへ強化
   */
  async saveStocktaking(
    adjustments: { itemCode: string; afterStock: number; remarks: string }[]
  ): Promise<void> {
    // 1件でも失敗した際の影響を最小限にするため、
    // 本来は Supabase RPC (PostgreSQL Function) で一括処理するのがベストです。
    // ここではフロントエンド側のロジックとして堅牢性を高めます。
    
    for (const adj of adjustments) {
      try {
        // 現在の在庫を取得
        const { data: current, error: getErr } = await supabase
          .from('t_item_stock')
          .select('actual_stock')
          .eq('item_code', adj.itemCode)
          .single();

        if (getErr) throw getErr;

        const beforeStock = current?.actual_stock ?? 0;
        if (beforeStock === adj.afterStock) continue;

        // 在庫更新とログ挿入
        // Note: Supabase JS SDK単体ではテーブルを跨ぐトランザクションは不可
        const { error: stockErr } = await supabase
          .from('t_item_stock')
          .update({ 
            actual_stock: adj.afterStock, 
            updated_at: new Date().toISOString() 
          })
          .eq('item_code', adj.itemCode);

        if (stockErr) throw stockErr;

        const { error: logErr } = await supabase
          .from('t_stocktaking_log')
          .insert({
            item_code: adj.itemCode,
            before_stock: beforeStock,
            after_stock: adj.afterStock,
            remarks: adj.remarks,
          });

        if (logErr) throw logErr;

      } catch (err) {
        console.error(`[Stocktaking Error] Item: ${adj.itemCode}`, err);
        throw new Error(`${adj.itemCode} の棚卸更新中にエラーが発生しました`);
      }
    }
  },

  /**
   * 出荷確定処理
   * ロットごとの在庫減算処理
   */
  async confirmShipping(
    order: { order_code: string; product_code: string },
    lotQuantities: { mfg_lot: string; quantity_cs: number; quantity_p: number }[],
    shippingDate: string
  ): Promise<void> {
    const shippingCode = `SHP-${Date.now()}`;
    
    // 1. 出荷レコードの作成
    const { error: shpErr } = await supabase
      .from('t_shipping')
      .insert({
        shipping_code: shippingCode,
        order_code: order.order_code,
        product_code: order.product_code,
        scheduled_date: shippingDate,
        shipping_cs: lotQuantities.reduce((s, l) => s + l.quantity_cs, 0),
        shipping_p: lotQuantities.reduce((s, l) => s + l.quantity_p, 0),
        status: '出荷済',
      });

    if (shpErr) throw shpErr;

    // 2. 各ロット在庫の減算
    // 以前の修正事項に基づき、手動選択された各ロットに対して処理
    for (const lot of lotQuantities) {
      // 最新の在庫数を取得（競合回避のため）
      const { data: ps, error: fetchErr } = await supabase
        .from('t_product_stock')
        .select('stock_cs, stock_p')
        .eq('mfg_lot', lot.mfg_lot)
        .single();

      if (fetchErr || !ps) {
        console.warn(`Lot ${lot.mfg_lot} not found, skipping.`);
        continue;
      }

      const { error: updateErr } = await supabase
        .from('t_product_stock')
        .update({
          stock_cs: ps.stock_cs - lot.quantity_cs,
          stock_p: ps.stock_p - lot.quantity_p,
          updated_at: new Date().toISOString()
        })
        .eq('mfg_lot', lot.mfg_lot);

      if (updateErr) throw updateErr;
    }
  }
};