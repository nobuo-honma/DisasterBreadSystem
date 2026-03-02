import { supabase } from '../lib/supabase/client';
import { TMfgPlan, TProductStock } from '../types';

export const manufacturingService = {
  async getPlansByOrder(orderCode: string): Promise<TMfgPlan[]> {
    const { data, error } = await supabase
      .from('t_mfg_plans')
      .select('*')
      .eq('order_code', orderCode)
      .order('scheduled_date');
    if (error) throw error;
    return data ?? [];
  },

  async getAllPlans(): Promise<TMfgPlan[]> {
    const { data, error } = await supabase
      .from('t_mfg_plans')
      .select('*')
      .order('scheduled_date');
    if (error) throw error;
    return data ?? [];
  },

  async savePlans(
    orderCode: string,
    plans: Partial<TMfgPlan>[]
  ): Promise<void> {
    for (const plan of plans) {
      if (plan.id) {
        const { error } = await supabase
          .from('t_mfg_plans')
          .update({ ...plan, order_code: orderCode })
          .eq('id', plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('t_mfg_plans')
          .insert({ ...plan, order_code: orderCode });
        if (error) throw error;
      }
    }
  },

  async updatePlanStatus(planId: string, status: TMfgPlan['status']): Promise<void> {
    const { error } = await supabase
      .from('t_mfg_plans')
      .update({ status })
      .eq('id', planId);
    if (error) throw error;
  },

  async updatePlanDate(planId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from('t_mfg_plans')
      .update({ scheduled_date: date })
      .eq('id', planId);
    if (error) throw error;
  },

  async saveProductionResult(result: Partial<TProductStock>): Promise<void> {
    if (!result.mfg_lot) throw new Error('mfg_lot は必須です');
    // 製造実績を登録
    const { error: resultErr } = await supabase
      .from('t_mfg_results')
      .insert({
        mfg_lot: result.mfg_lot,
        product_code: result.product_code,
        actual_total_pcs: (result.stock_cs ?? 0) + (result.stock_p ?? 0),
        actual_cs: result.stock_cs ?? 0,
        actual_p: result.stock_p ?? 0,
      });
    if (resultErr) throw resultErr;

    // 製品在庫に追加
    const { error: stockErr } = await supabase
      .from('t_product_stock')
      .insert({
        mfg_lot: result.mfg_lot,
        product_code: result.product_code,
        stock_cs: result.stock_cs ?? 0,
        stock_p: result.stock_p ?? 0,
        expiry_date: result.expiry_date,
      });
    if (stockErr) throw stockErr;
  },
};
