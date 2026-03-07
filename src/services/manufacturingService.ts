/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import type { TMfgPlan, TProductStock } from '../types';

export const manufacturingService = {
  /**
   * 受注コードに紐づく製造計画を取得
   */
  async getPlansByOrder(orderCode: string): Promise<TMfgPlan[]> {
    const { data, error } = await supabase
      .from('t_mfg_plans')
      .select('*')
      .eq('order_code', orderCode)
      .order('scheduled_date');

    if (error) {
      console.error(`[manufacturingService] Failed to fetch plans for ${orderCode}:`, error);
      throw new Error('製造計画の取得に失敗しました');
    }
    return data ?? [];
  },

  /**
   * 全ての製造計画を取得
   */
  async getAllPlans(): Promise<TMfgPlan[]> {
    const { data, error } = await supabase
      .from('t_mfg_plans')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /**
   * 製造計画を一括保存（Upsert対応）
   * ループでの逐次処理を避け、バルクアップサートで通信を最適化
   */
  async savePlans(
    orderCode: string,
    plans: Partial<TMfgPlan>[]
  ): Promise<void> {
    if (plans.length === 0) return;

    // 受注コードを全レコードに付与
    const plansWithOrder = plans.map(plan => ({
      ...plan,
      order_code: orderCode,
      updated_at: new Date().toISOString(),
    }));

    // .upsert() を使用することで、IDがあれば更新、なければ挿入を1リクエストで完結
    const { error } = await supabase
      .from('t_mfg_plans')
      .upsert(plansWithOrder, { onConflict: 'id' });

    if (error) {
      console.error('[manufacturingService] Bulk upsert failed:', error);
      throw new Error('計画の保存中にエラーが発生しました');
    }
  },

  /**
   * 製造ステータスの更新（進捗管理用）
   */
  async updatePlanStatus(planId: string, status: TMfgPlan['status']): Promise<void> {
    const { error } = await supabase
      .from('t_mfg_plans')
      .update({ 
        status,
        // ステータス変更時に完了日などを自動付与するロジックをここに追加可能
        ...(status === '完了' ? { actual_date: new Date().toISOString().slice(0, 10) } : {})
      })
      .eq('id', planId);

    if (error) throw error;
  },

  /**
   * 製造計画日の変更（リスケジュール）
   */
  async updatePlanDate(planId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from('t_mfg_plans')
      .update({ scheduled_date: date })
      .eq('id', planId);

    if (error) throw error;
  },

  /**
   * 製造実績の登録と在庫反映
   * 実績(t_mfg_results)と在庫(t_product_stock)の2箇所へ書き込み
   */
  async saveProductionResult(result: Partial<TProductStock>): Promise<void> {
    if (!result.mfg_lot) throw new Error('製造ロット番号(mfg_lot)は必須です');

    // 本来は RPC (Stored Function) で一括処理が望ましいが、
    // ここではフロントエンド側の整合性を高めるため、エラーハンドリングを厳密化
    try {
      // 1. 製造実績(t_mfg_results)への登録
      const { error: resultErr } = await supabase
        .from('t_mfg_results')
        .insert({
          mfg_lot: result.mfg_lot,
          product_code: result.product_code,
          actual_total_pcs: (result.stock_cs ?? 0) + (result.stock_p ?? 0),
          actual_cs: result.stock_cs ?? 0,
          actual_p: result.stock_p ?? 0,
          created_at: new Date().toISOString()
        });

      if (resultErr) throw resultErr;

      // 2. 製品在庫(t_product_stock)への追加
      const { error: stockErr } = await supabase
        .from('t_product_stock')
        .insert({
          mfg_lot: result.mfg_lot,
          product_code: result.product_code,
          stock_cs: result.stock_cs ?? 0,
          stock_p: result.stock_p ?? 0,
          expiry_date: result.expiry_date,
          status: '在庫あり'
        });

      if (stockErr) throw stockErr;

    } catch (err) {
      console.error('[manufacturingService] saveProductionResult failed:', err);
      throw new Error(`ロット ${result.mfg_lot} の実績登録に失敗しました。管理者へ連絡してください。`);
    }
  },
};