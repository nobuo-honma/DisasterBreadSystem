import { supabase } from '../lib/supabase/client';
import { TOrder } from '../types';

export const orderService = {
  async getOrders(): Promise<TOrder[]> {
    const { data, error } = await supabase
      .from('t_orders')
      .select('*')
      .order('order_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getPendingOrders(): Promise<TOrder[]> {
    const { data, error } = await supabase
      .from('t_orders')
      .select('*')
      .not('status', 'in', '("完了","出荷済")')
      .order('request_delivery_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveOrder(
    orderHeader: Partial<TOrder>,
    _orderDetails?: unknown[]
  ): Promise<void> {
    if (orderHeader.id) {
      // 更新
      const { error } = await supabase
        .from('t_orders')
        .update(orderHeader)
        .eq('id', orderHeader.id);
      if (error) throw error;
    } else {
      // 新規登録
      const { error } = await supabase
        .from('t_orders')
        .insert(orderHeader);
      if (error) throw error;
    }
  },

  async updateStatus(id: string, status: TOrder['status']): Promise<void> {
    const { error } = await supabase
      .from('t_orders')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },
};
