import { createClient } from '@supabase/supabase-js';

/**
 * Supabaseクライアントの初期化
 * 配置場所: src/lib/supabase/client.ts
 */

// 1. Viteの環境変数から情報を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. 実行時バリデーション
// ディレクトリが深いため、環境変数が読み込めないリスクを考慮して詳細なエラーを出します。
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 
    `【環境変数エラー】Supabaseの接続情報が見つかりません。\n` +
    `確認事項:\n` +
    `1. プロジェクトのルート（srcフォルダの外）に ".env.local" があるか\n` +
    `2. 変数名が "VITE_SUPABASE_URL" と "VITE_SUPABASE_ANON_KEY" か\n` +
    `3. サーバーを再起動（npm run dev）したか`;
  
  console.error(errorMsg);
  throw new Error('Missing Supabase Environment Variables');
}

// 3. クライアントの生成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);