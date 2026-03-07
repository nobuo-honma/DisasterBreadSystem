/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database'; // 生成された型定義をインポート

/**
 * 環境変数の取得と厳密なバリデーション
 */
const getEnvVar = (name: string): string => {
  const value = import.meta.env[name];
  if (!value) {
    const errorMsg = 
      `【環境変数未定義】${name} が見つかりません。\n` +
      `確認手順:\n` +
      `1. プロジェクトルートの ".env.local" ファイルを点検してください。\n` +
      `2. Prefixが "VITE_" で始まっているか確認してください。\n` +
      `3. 開発サーバー（npm run dev）を再起動して反映を確認してください。`;
    
    console.error(`[Supabase Config Error] ${errorMsg}`);
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

/**
 * Supabaseクライアントのインスタンス化
 * ジェネリクスに <Database> を渡すことで、
 * .from('table_name') の時点でカラム名の補完と型チェックが有効になります。
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // セッションの永続化
    autoRefreshToken: true, // トークンの自動更新を有効化
    detectSessionInUrl: true, // OAuth連携などのリダイレクトを検知
  },
  global: {
    headers: { 'x-application-name': 'disaster-bread-system-v3' },
  },
});

// 接続確認（デバッグ用: 開発環境のみ）
if (import.meta.env.DEV) {
  console.log('✅ Supabase Client Initialized with Type Safety');
}