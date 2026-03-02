import { supabase } from '../lib/supabase/client';
import { TReceiving } from '../types';

export const receivingService = {
  async getReceivings(): Promise<TReceiving[]> {
    const { data, error } = await supabase
      .from('t_receiving')
      .select('*')
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getReceivingList(): Promise<TReceiving[]> {
    return this.getReceivings();
  },

  async saveReceiving(rec: Partial<TReceiving>): Promise<void> {
    if (rec.id) {
      const { error } = await supabase
        .from('t_receiving')
        .update(rec)
        .eq('id', rec.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('t_receiving')
        .insert(rec);
      if (error) throw error;
    }
  },

  async registerReceiving(data: Partial<TReceiving>): Promise<void> {
    const { error } = await supabase
      .from('t_receiving')
      .insert(data);
    if (error) throw error;
  },

  async processReceiving(row: TReceiving, actualQty: number): Promise<void> {
    const status: TReceiving['status'] =
      actualQty >= row.order_quantity ? '入荷済' : '一部入荷';

    // 入荷レコードを更新
    const { error: recErr } = await supabase
      .from('t_receiving')
      .update({ actual_quantity: actualQty, status })
      .eq('id', row.id);
    if (recErr) throw recErr;

    // 品目在庫に加算
    const { data: current } = await supabase
      .from('t_item_stock')
      .select('actual_stock')
      .eq('item_code', row.item_code)
      .single();

    if (current) {
      const { error: stockErr } = await supabase
        .from('t_item_stock')
        .update({ actual_stock: current.actual_stock + actualQty })
        .eq('item_code', row.item_code);
      if (stockErr) throw stockErr;
    }

    // 在庫ログを記録
    const { error: logErr } = await supabase
      .from('t_stock_log')
      .insert({
        tx_type: '入荷',
        target_type: '品目',
        item_code: row.item_code,
        quantity: actualQty,
        related_code: row.receiving_code,
        remarks: `入荷処理: ${row.receiving_code}`,
      });
    if (logErr) throw logErr;
  },
};
