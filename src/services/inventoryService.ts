import { supabase } from '../lib/supabase/client';
import { TItemStock, TProductStock, TStocktakingLog } from '../types';

export const inventoryService = {
  async getItemStocks(category?: string): Promise<TItemStock[]> {
    let query = supabase
      .from('t_item_stock')
      .select('*')
      .order('item_code');

    if (category) {
      // item_code でm_itemsとjoinして絞り込む場合は別途対応
      // ここでは item_code プレフィックスでの簡易フィルタ
      query = query.like('item_code', `${category}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getProductStocks(): Promise<TProductStock[]> {
    const { data, error } = await supabase
      .from('t_product_stock')
      .select('*')
      .order('expiry_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveStocktaking(
    adjustments: { itemCode: string; afterStock: number; remarks: string }[],
    _productAdjustments?: unknown
  ): Promise<void> {
    for (const adj of adjustments) {
      // 現在在庫を取得
      const { data: current } = await supabase
        .from('t_item_stock')
        .select('actual_stock')
        .eq('item_code', adj.itemCode)
        .single();

      const beforeStock = current?.actual_stock ?? 0;

      // 在庫を更新
      const { error: stockErr } = await supabase
        .from('t_item_stock')
        .update({ actual_stock: adj.afterStock, updated_at: new Date().toISOString() })
        .eq('item_code', adj.itemCode);
      if (stockErr) throw stockErr;

      // 棚卸ログを記録
      const { error: logErr } = await supabase
        .from('t_stocktaking_log')
        .insert({
          item_code: adj.itemCode,
          before_stock: beforeStock,
          after_stock: adj.afterStock,
          remarks: adj.remarks,
        });
      if (logErr) throw logErr;
    }
  },

  async getStocktakingLogs(): Promise<TStocktakingLog[]> {
    const { data, error } = await supabase
      .from('t_stocktaking_log')
      .select('*')
      .order('adjusted_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  async confirmShipping(
    order: { order_code: string; product_code: string },
    lotQuantities: { mfg_lot: string; quantity_cs: number; quantity_p: number }[],
    shippingDate: string
  ): Promise<void> {
    // 出荷レコードを作成
    const shippingCode = `SHP-${Date.now()}`;
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

    // 各ロットの在庫を減算
    for (const lot of lotQuantities) {
      const { data: ps } = await supabase
        .from('t_product_stock')
        .select('stock_cs, stock_p')
        .eq('mfg_lot', lot.mfg_lot)
        .single();
      if (!ps) continue;

      const { error } = await supabase
        .from('t_product_stock')
        .update({
          stock_cs: ps.stock_cs - lot.quantity_cs,
          stock_p: ps.stock_p - lot.quantity_p,
        })
        .eq('mfg_lot', lot.mfg_lot);
      if (error) throw error;
    }
  },
};
