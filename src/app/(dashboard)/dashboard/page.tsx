'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import type { TItemStock, TMfgPlan, TStocktakingLog } from '../../../types/database';

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<TItemStock[]>([]);
  const [todayPlans, setTodayPlans] = useState<TMfgPlan[]>([]);
  const [stocktakingLogs, setStocktakingLogs] = useState<TStocktakingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError('Supabase の設定を確認してください。（.env.local）');
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      try {
        const [stocksRes, plansRes, logsRes] = await Promise.all([
          supabase.from('t_item_stock').select('*').in('stock_status', ['在庫低下', '欠品']),
          supabase.from('t_mfg_plans').select('*').eq('scheduled_date', today).order('scheduled_date'),
          supabase.from('t_stocktaking_log').select('*').order('adjusted_at', { ascending: false }).limit(10)
        ]);

        if (stocksRes.error) throw stocksRes.error;
        if (plansRes.error) throw plansRes.error;
        if (logsRes.error) throw logsRes.error;

        setAlerts(stocksRes.data ?? []);
        setTodayPlans(plansRes.data ?? []);
        setStocktakingLogs(logsRes.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-slate-400">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
        <p className="animate-pulse font-bold tracking-widest text-xs">LOADING DASHBOARD...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-black uppercase tracking-tight">System Configuration Error</h2>
        </div>
        <p className="text-sm font-medium leading-relaxed">{error}</p>
        <div className="mt-6 p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-500 font-mono">
          TIP: Check your .env.local file and ensure SUPABASE_URL and ANON_KEY are correctly set.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 text-slate-200">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">ダッシュボード</h1>
            <p className="text-slate-500 font-medium mt-1">Operational Overview & Critical Alerts</p>
          </div>
          <Link
            href="/manual"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all hover:text-white group"
          >
            <BookOpen size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
            操作マニュアルを表示
          </Link>
        </div>
        <div className="text-right">
          <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">System Status</div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            CONNECTED
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: ALERTS & PLANS */}
        <div className="space-y-8">
          {/* 在庫不足アラート */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all hover:border-slate-700">
            <div className="bg-slate-800/50 px-5 py-4 border-b border-slate-700 flex items-center gap-3">
              <span className="text-amber-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </span>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">在庫不足アラート</h2>
            </div>
            <div className="p-5">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-slate-600 italic text-sm">現在、在庫不足の品目はありません</div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40 group hover:border-amber-500/30 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-amber-500/80 mb-1 tracking-tighter uppercase">{a.stock_status} ALERT</span>
                        <span className="text-sm font-bold text-white tracking-tight">{a.item_code}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Available</div>
                        <div className={`text-sm font-black ${a.stock_status === '欠品' ? 'text-rose-500' : 'text-amber-500'}`}>{a.available_stock}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 本日の予定 */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="bg-slate-800/50 px-5 py-4 border-b border-slate-700">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">本日の製造予定</h2>
            </div>
            <div className="p-5">
              {todayPlans.length === 0 ? (
                <div className="py-8 text-center text-slate-600 italic text-sm">本日の製造予定はありません</div>
              ) : (
                <div className="space-y-3">
                  {todayPlans.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/20">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono font-bold text-blue-500 mb-0.5">{p.plan_code}</div>
                        <div className="text-sm font-bold text-white truncate">{p.product_code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-200">{p.amount_kg}kg</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: LOGS */}
        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md flex flex-col h-full">
            <div className="bg-slate-800/50 px-5 py-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">最新棚卸履歴</h2>
              <span className="text-[10px] font-bold text-slate-500">RECENT 10 LOGS</span>
            </div>
            <div className="p-5 flex-1 overflow-y-auto max-h-[720px] scrollbar-thin">
              {stocktakingLogs.length === 0 ? (
                <div className="py-20 text-center text-slate-600 italic text-sm">履歴はまだありません</div>
              ) : (
                <div className="space-y-1">
                  {stocktakingLogs.map((l) => (
                    <div key={l.id} className="flex items-center p-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{l.item_code}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{new Date(l.adjusted_at).toLocaleString('ja-JP')}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[9px] font-bold text-slate-600 uppercase">Change</div>
                          <div className="text-xs font-mono font-bold flex items-center gap-2">
                            <span className="text-slate-500">{l.before_stock}</span>
                            <span className="text-blue-500 text-[10px]">→</span>
                            <span className="text-blue-400">{l.after_stock}</span>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${l.after_stock > l.before_stock ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {l.after_stock > l.before_stock ? '▲' : '▼'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}