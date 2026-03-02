import { supabase } from '../lib/supabase/client';
import { TItemStock, TMfgPlan, TStocktakingLog } from '../types';

export const dashboardService = {
  async getDashboardData() {
    const today = new Date().toISOString().slice(0, 10);

    const [alertsRes, plansRes, logsRes] = await Promise.all([
      supabase
        .from('t_item_stock')
        .select('*')
        .in('stock_status', ['在庫低下', '欠品'])
        .order('stock_status'),

      supabase
        .from('t_mfg_plans')
        .select('*')
        .eq('scheduled_date', today)
        .order('plan_code'),

      supabase
        .from('t_stocktaking_log')
        .select('*')
        .order('adjusted_at', { ascending: false })
        .limit(10),
    ]);

    if (alertsRes.error) console.error('在庫アラート取得エラー:', alertsRes.error);
    if (plansRes.error) console.error('製造計画取得エラー:', plansRes.error);
    if (logsRes.error) console.error('棚卸ログ取得エラー:', logsRes.error);

    return {
      alerts: (alertsRes.data ?? []) as TItemStock[],
      todayPlans: (plansRes.data ?? []) as TMfgPlan[],
      stocktakingLogs: (logsRes.data ?? []) as TStocktakingLog[],
    };
  },
};
