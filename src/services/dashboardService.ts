/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import type { TItemStock, TMfgPlan, TStocktakingLog } from '../types';

export const dashboardService = {
  /**
   * ダッシュボードに必要な全データを一括取得する
   * @throws データ取得に致命的な失敗があった場合に Error をスローします
   */
  async getDashboardData() {
    // タイムゾーンを考慮した「今日」の日付文字列 (YYYY-MM-DD)
    // ISOStringはUTCになるため、日本時間(JST)等での運用なら調整が必要です
    const today = new Date().toLocaleDateString('sv-SE'); // 'YYYY-MM-DD' 形式を保証

    const [alertsRes, plansRes, logsRes] = await Promise.all([
      // 1. 在庫低下・欠品品目の抽出
      supabase
        .from('t_item_stock')
        .select('*')
        .in('stock_status', ['在庫低下', '欠品'])
        // 欠品を優先的に上に持ってくる（テーブル定義に依存）
        .order('stock_status', { ascending: false }),

      // 2. 本日の製造計画
      supabase
        .from('t_mfg_plans')
        .select('*')
        .eq('scheduled_date', today)
        .order('plan_code'),

      // 3. 最新の棚卸ログ（直近10件）
      supabase
        .from('t_stocktaking_log')
        .select('*')
        .order('adjusted_at', { ascending: false })
        .limit(10),
    ]);

    // いずれかのクエリでエラーが発生した場合の集約処理
    const errors = [alertsRes.error, plansRes.error, logsRes.error].filter(Boolean);
    
    if (errors.length > 0) {
      const messages = errors.map(e => e?.message).join(', ');
      console.group('🔴 Dashboard Data Fetch Error');
      console.error('Errors:', errors);
      console.groupEnd();
      throw new Error(`一部のデータ取得に失敗しました: ${messages}`);
    }

    return {
      alerts: (alertsRes.data ?? []) as TItemStock[],
      todayPlans: (plansRes.data ?? []) as TMfgPlan[],
      stocktakingLogs: (logsRes.data ?? []) as TStocktakingLog[],
    };
  },
};