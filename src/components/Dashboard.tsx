/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BookOpen, AlertTriangle, Package, History, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { dashboardService } from '../services/dashboardService';
import type { TItemStock, TMfgPlan, TStocktakingLog } from '../types';

export default function Dashboard() {
  const [alerts, setAlerts] = useState<TItemStock[]>([]);
  const [todayPlans, setTodayPlans] = useState<TMfgPlan[]>([]);
  const [stocktakingLogs, setStocktakingLogs] = useState<TStocktakingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await dashboardService.getDashboardData();
        setAlerts(data.alerts);
        setTodayPlans(data.todayPlans);
        setStocktakingLogs(data.stocktakingLogs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent mb-4"
        />
        <p className="animate-pulse font-bold tracking-widest text-xs uppercase">Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-black uppercase tracking-tight">System Error</h2>
        </div>
        <p className="text-sm font-medium leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-8">
        <div className="space-y-1">
          <h1 className="bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400 text-4xl font-black tracking-tight">
            ダッシュボード
          </h1>
          <p className="text-slate-500 font-medium text-sm">Operational Overview & Critical Alerts</p>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all hover:text-white group">
            <BookOpen size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
            操作マニュアル
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">System Status</div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              CONNECTED
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: ALERTS & PLANS */}
        <div className="lg:col-span-7 space-y-8">
          {/* 在庫不足アラート */}
          <section className="bg-slate-900/40 border border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm transition-all hover:border-slate-700/50">
            <div className="bg-slate-800/30 px-6 py-4 border-b border-slate-800/50 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">在庫不足アラート</h2>
            </div>
            <div className="p-6">
              {alerts.length === 0 ? (
                <div className="py-12 text-center text-slate-600 italic text-sm font-medium">
                  現在、在庫不足の品目はありません
                </div>
              ) : (
                <div className="grid gap-3">
                  {alerts.map((a) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={a.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40 group hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-amber-500/80 mb-1 tracking-tighter uppercase">
                          {a.stock_status} ALERT
                        </span>
                        <span className="text-sm font-bold text-white tracking-tight">{a.item_code}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Available</div>
                        <div className={`text-sm font-black ${a.stock_status === '欠品' ? 'text-rose-500' : 'text-amber-500'}`}>
                          {a.available_stock}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 本日の予定 */}
          <section className="bg-slate-900/40 border border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="bg-slate-800/30 px-6 py-4 border-b border-slate-800/50 flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">本日の製造予定</h2>
            </div>
            <div className="p-6">
              {todayPlans.length === 0 ? (
                <div className="py-12 text-center text-slate-600 italic text-sm font-medium">
                  本日の製造予定はありません
                </div>
              ) : (
                <div className="grid gap-3">
                  {todayPlans.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/20 transition-colors">
                      <div className="bg-blue-600/10 p-2.5 rounded-lg border border-blue-500/20">
                        <Activity className="w-5 h-5 text-blue-400" />
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
        <div className="lg:col-span-5">
          <section className="bg-slate-900/40 border border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col h-full sticky top-6">
            <div className="bg-slate-800/30 px-6 py-4 border-b border-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-slate-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">最新棚卸履歴</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">RECENT 10</span>
            </div>
            <div className="p-2 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-800">
              {stocktakingLogs.length === 0 ? (
                <div className="py-24 text-center text-slate-600 italic text-sm font-medium">
                  履歴はまだありません
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {stocktakingLogs.map((l) => (
                    <div key={l.id} className="flex items-center p-4 hover:bg-slate-800/20 transition-colors">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{l.item_code}</div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {new Date(l.adjusted_at).toLocaleString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mb-0.5">Stock Shift</div>
                          <div className="text-xs font-mono font-bold flex items-center gap-2">
                            <span className="text-slate-500">{l.before_stock}</span>
                            <span className="text-blue-500/50 text-[10px]">→</span>
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

