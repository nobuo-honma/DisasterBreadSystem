import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** ブラウザでのみ使用してください。SSR 時は null を返します。 */
export function createClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を .env.local に設定してください');
      return null;
    }
    client = createSupabaseClient(url, key);
  }
  return client;
}
