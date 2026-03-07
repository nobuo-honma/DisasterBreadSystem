/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// シングルトン（一度作成したインスタンスを再利用する）ための変数
let supabaseInstance: SupabaseClient | null = null;

/**
 * Supabase クライアントを取得または生成する関数
 * 配置場所: src/lib/supabase.ts (または lib/supabase.ts)
 */
export function createClient() {
  // すでにインスタンスが存在すればそれを返す（リソース節約）
  if (supabaseInstance) return supabaseInstance;

  // Next.jsの環境変数から取得
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. 厳密なバリデーション
  if (!url || !key) {
    const isServer = typeof window === 'undefined';
    const envFile = isServer ? '.env か .env.local' : 'Vercel等の環境変数設定';
    
    throw new Error(
      `[Supabase Configuration Error]\n` +
      `URLまたはAnonKeyが未定義です。${envFile} を確認してください。\n` +
      `Location: ${isServer ? 'Server-side' : 'Client-side'}`
    );
  }

  // 2. クライアントの生成
  supabaseInstance = createSupabaseClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    // 必要に応じてグローバルなリトライ設定などを追加
    global: {
      fetch: (...args) => fetch(...args),
    },
  });

  return supabaseInstance;
}

// ショートカットとしてエクスポート
export const supabase = createClient();